# `specs/` — backlog de funcionalidades do boilerplate

Esta pasta é a **entrada do ciclo de desenvolvimento** deste repositório. Enquanto `docs/features/<slug>/`
guarda o histórico de *como* uma tarefa foi construída, `specs/` guarda o catálogo do que **ainda vale a
pena construir** — e o porquê.

> **Regra que define a pasta:** `specs/` contém **apenas o que não foi entregue**. Quando uma spec é
> concluída, ela **sai daqui** e passa a viver em `docs/features/<slug>/spec.md`, junto do plano, do
> handoff, da revisão e dos testes daquela feature. Olhar para `specs/` é ver o que falta — sempre.

> **Este repo é um core de MVPs.** Uma spec só entra aqui se for **genérica o bastante para servir a
> qualquer fork** e **valiosa o bastante para alguém sentir falta**. Funcionalidade de um produto único
> não vira spec — vira código no fork.

## O ciclo (loop engineering)

```
        ┌─────────────────────────── ciclo fechado ───────────────────────────┐
        │                                                                     │
   /spec ──→ /analyze ──→ /develop ──→ /review ──→ /test ──→ /observe ────────┘
  descobrir    planejar    implementar   revisar     QA      comunicar
  e priorizar
  (specs/)   (docs/features/<slug>/ ......................................)
```

1. **`/spec`** varre o repositório, confronta com padrões de mercado e escreve/atualiza specs aqui.
2. Você escolhe uma spec e roda **`/analyze <id>`** — o nome da spec é o argumento padrão do `/analyze`.
   O plano técnico nasce da spec, e o `STATE.md` da feature aponta de volta para ela.
3. O pipeline segue normalmente (`/develop → /review → /test`). **A spec fica aqui o tempo todo**, com
   status `in-progress`: enquanto não estiver entregue, ela é backlog.
4. **`/spec --sync`** reconcilia o backlog com o código. O que foi entregue vira `done` **e é movido** para
   `docs/features/<slug>/spec.md`; o que o mercado tornou irrelevante vira `rejected`/`superseded`. O ciclo
   recomeça com o backlog já limpo.

O que faz disso um *loop* e não uma lista de desejos é o passo 4: **o backlog é auditado contra a
realidade do código**, não mantido à mão. E como a spec entregue **sai da pasta**, `specs/` não acumula —
o tamanho dela é a medida do que falta.

## Ciclo de vida de uma spec

```
specs/<id>.md                          docs/features/<slug>/
├── proposed    (descoberta)                 │
├── approved    (você triou)                 │
├── in-progress (/analyze <id> …             │
│               … /develop /review /test)    │
└── done ──────── /spec --sync move ────────→ spec.md   ← junto do plano, handoff, review e testes
```

**Quem move:** o `/spec --sync`, e **só depois de confirmar no código** que o corte de MVP foi entregue.
Nunca mova à mão e nunca mova por acreditar no `status` gravado — é justamente essa verificação que
sustenta o loop.

**Como move:** `git mv specs/<id>.md docs/features/<slug>/spec.md`, para preservar o histórico do arquivo.
No destino, o frontmatter fica com `status: done`, `feature: <slug>` e a data de entrega.

**O que NÃO sai daqui:** `rejected`, `superseded` e `deferred` permanecem em `specs/`. Eles não têm feature
para onde ir, e são a memória institucional que impede o `/spec` de repropor a mesma coisa na próxima
rodada. O `BACKLOG.md` os separa da fila ativa.

## Spec × plano — a fronteira

| | `specs/<id>.md` | `docs/features/<slug>/analyze/plan.md` |
|---|---|---|
| Responde | **o quê** e **por quê** | **como** |
| Dono | `estrategista-produto` (`/spec`) | `planejador-tarefa` (`/analyze`) |
| Contém | problema, evidência de mercado, corte de MVP, impacto por app em alto nível, riscos | contrato do SDK, schema Zod, handler, árvore de arquivos, pseudo-diffs, ordem de commit |
| Vive | até ser entregue ou rejeitada | por tarefa, junto do histórico |

Uma spec **não** contém pseudo-diff, nome de arquivo a criar nem assinatura de função. Se você está
escrevendo isso, já é `/analyze`.

## Estrutura

```
specs/
  README.md          ← este arquivo
  BACKLOG.md         ← índice priorizado (fonte da ordem)
  TEMPLATE.md        ← esqueleto de uma spec nova
  <id>.md            ← uma spec por arquivo
  research/          ← notas de pesquisa de mercado, com fontes e data
    <topico>.md
```

- **`id` = nome do arquivo = slug em inglês** (`audit-log`, `usage-limits`), igual à convenção de
  `docs/features/`. O **conteúdo é em português**.
- O `BACKLOG.md` é a **fonte da ordem**; o arquivo da spec é a fonte do conteúdo. Os dois são atualizados
  juntos pelo `/spec`.

## Frontmatter (obrigatório)

```yaml
---
id: audit-log
title: Trilha de auditoria
status: proposed
value: alto            # alto | médio | baixo — valor percebido por quem usa o fork
effort: M              # P (≤1 dia) | M (2–4 dias) | G (>1 semana)
audience: produto      # produto | dx | confianca — quem colhe o benefício
area: [apps/api, apps/app, packages/sdk]
mode: ambos            # subscription | simple | ambos — modo de produto afetado
depends_on: []         # ids de outras specs que precisam vir antes
feature: -             # slug em docs/features/<slug> quando entra em execução
updated: 2026-08-21
---
```

### `status`

| status | significa | onde o arquivo vive | quem move |
|--------|-----------|---------------------|-----------|
| `proposed` | descoberta pelo `/spec`, ainda não validada por você | `specs/` | `/spec` |
| `approved` | você aprovou; está na fila para virar tarefa | `specs/` | você (via `/spec`) |
| `in-progress` | tem uma feature em `docs/features/` em andamento | `specs/` | `/analyze <id>` |
| `done` | entregue e **confirmada no código** | **`docs/features/<slug>/spec.md`** | `/spec --sync` |
| `deferred` | vale, mas não agora (motivo obrigatório) | `specs/` | você |
| `rejected` | não vai acontecer (motivo obrigatório) | `specs/` | você |
| `superseded` | absorvida por outra spec (aponte qual) | `specs/` | `/spec` |

### `audience`

- **`produto`** — valor direto para o usuário final do fork (notificações, times, exportar dados).
- **`dx`** — valor para quem desenvolve o fork (CI, seed, emulador, paginação real).
- **`confianca`** — segurança, privacidade, conformidade e acessibilidade (LGPD, MFA, WCAG).

Um backlog saudável tem as três. Só `produto` produz um MVP bonito que ninguém consegue operar; só `dx`
produz uma base impecável que não entrega nada.

## Regras de qualidade de uma spec

1. **Evidência dos dois lados.** Toda spec cita (a) o que **já existe no repo**, com `arquivo.ts:linha`, e
   (b) por que o **mercado** trata aquilo como padrão, com URL e data. Sem os dois, é `proposed` fraca.
2. **Corte de MVP explícito.** A menor fatia vertical que entrega valor observável, no padrão do slice de
   referência `entity`. O resto vai para "Fora do corte".
3. **Genérico, não específico.** Se a spec só faz sentido para um domínio (clínica, delivery, imobiliária),
   ela não pertence a este repo.
4. **Nada de duplicar o que existe.** Antes de propor, o `/spec` procura o helper/padrão já presente. Uma
   spec que reimplementa algo existente é um bug do processo.
5. **Ceticismo sobre hype.** "Aparece em 1 de 12 starters" é informação, e deve estar escrita.

## Notas de pesquisa (`specs/research/`)

Pesquisa de mercado envelhece. Cada nota traz `collected:` (data) e `revalidate_after:` no frontmatter, e
lista as URLs consultadas. Uma spec referencia a nota em vez de recopiar os argumentos — assim, quando a
nota é revalidada, todas as specs que dependem dela sabem disso.

## Comandos

```bash
/spec                 # descoberta: varre o repo + mercado e propõe specs novas
/spec <ideia>         # escreve/atualiza a spec de uma ideia específica
/spec --next          # recomenda a próxima spec a atacar, com justificativa
/analyze <id>         # transforma a spec em plano técnico (o nome da spec é o argumento padrão)
/develop → /review → /test
/spec --sync          # confirma a entrega no código, fecha a spec e a move para a feature
```

Detalhes do pipeline: [`docs/TASK-PIPELINE.md`](../docs/TASK-PIPELINE.md). Ferramental:
[`docs/AI-WORKFLOW.md`](../docs/AI-WORKFLOW.md).
