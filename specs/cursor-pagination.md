---
id: cursor-pagination
title: Paginação por cursor no BaseRepository e no SDK
status: proposed
value: alto
effort: M
audience: dx
area: [apps/api, packages/sdk, apps/app, packages/design-system]
mode: ambos
depends_on: [firestore-admin-access]
feature: -
updated: 2026-08-21
---

# Paginação por cursor no BaseRepository e no SDK

## Problema

Toda listagem deste boilerplate lê a coleção inteira do Firestore, transporta tudo pela API e joga o array
completo na tabela, que então pagina no navegador. Com dezenas de registros ninguém percebe; com milhares,
o fork paga leitura por documento a cada abertura de tela e a página trava. Como todo fork nasce copiando
o slice `entity`, **o problema é herdado por construção** — não é escolha, é o único caminho que existe.
E corrigir depois de haver dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo.

## O que já existe no repo

- `apps/api/(shared)/repositories/base.repository.ts:45-55` — `findAll()` monta a query só com
  `where("deletedAt", "==", null)`: **sem `limit`, sem `orderBy`, sem cursor e sem contagem**. É a base de
  toda listagem, e nenhum dos métodos do `BaseRepository<DTO>` (34-141) aceita parâmetro de consulta.
- **Achado adicional:** `findAll()` (51-54) devolve `{ id, ...doc.data() }` cru e **ignora o `rowMapper`**,
  enquanto `findById()` (67-71) o aplica — as duas rotas de leitura produzem formatos diferentes, o que
  precisa ser reconciliado junto com a paginação.
- `apps/api/(shared)/repositories/entity.repository.ts:12-33` — `listByUserId` filtra `deletedAt` em
  memória (20-23) e ordena por `createdAt` em memória (28-32).
- `apps/api/(shared)/repositories/user.repository.ts:36-47` — `list({type})` chama `findAll()` e filtra por
  tipo em memória (37-39); depois faz **uma chamada ao Admin SDK por usuário** (42-46, 56-67).
- `packages/sdk/src/actions/entity/action.ts:15-22` e
  `packages/sdk/src/actions/user/user/action.ts:21-31` — `list()` devolve array cru, **sem envelope**: não
  há onde caber cursor ou `hasMore` sem quebrar o contrato.
- `apps/app/.../entities/(hooks)/useListEntities.tsx:11-17` — query única, sem parâmetros; é o padrão
  `useListX`/`fetchXList` que todo fork copia.
- `packages/design-system/components/ui/table.tsx:11-22` — `TableProps` estende `AntdTableProps` sem tratar
  `pagination`: o que a tela exibe é a **paginação client-side padrão do antd**, sobre o array inteiro.
- `firestore.indexes.json:1-4` — **vazio**. Qualquer consulta composta nova falha em produção sem aviso.
- `docs/feature-analysis-guide.md:85-93` (seção 2.2) — o repo **já reconhece a lacuna por escrito**: "o
  `BaseRepository` não tem paginação, `orderBy` nem filtros compostos… é uma decisão de arquitetura a
  registrar, não algo a improvisar no handler". Esta spec é essa decisão.
- **Lacuna:** não existe paginação em nenhuma camada — nem no repositório, nem no contrato, nem na UI.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 11 (paginação por cursor)** — *padrão de facto no Firestore* e uma das quatro práticas que a
  nota considera indispensáveis aqui, porque o `offset` do Firestore **cobra os documentos que pulou**.
- Armadilhas registradas na mesma prática, que a proposta precisa absorver: cursor exige **`orderBy`
  estável** (com desempate por `__name__`); filtro composto novo exige índice e **falha só em runtime**; e
  "ir para a página 7" **não existe** nesse modelo — a UI vira "carregar mais" ou próxima/anterior. Não é
  hype: é a forma que a documentação do próprio provedor prescreve para ler coleções grandes.

## Proposta — corte de MVP

- [ ] O repositório base lê uma "página" de uma coleção — tamanho pedido pelo chamador, ordenação estável,
      ponto de retomada opaco — com filtro e ordenação **no Firestore**, não em memória.
- [ ] As listagens da API respondem em **envelope** (itens + cursor da próxima página) em vez de array cru,
      com teto de tamanho aplicado no servidor mesmo quando o cliente pede mais.
- [ ] O SDK expõe o envelope como contrato tipado e o slice `entity` é migrado inteiro (repositório → rota
      → SDK → hook → tela), virando o template que os forks copiam.
- [ ] A tabela do design system opera em modo servidor (carregar mais / próxima-anterior) sem perder busca
      e refresh.
- [ ] Os índices compostos exigidos por essas consultas passam a viver versionados no repositório.

### Fora do corte

- Busca textual no servidor: o `searchFields` da tabela filtra no cliente e passaria a filtrar só a página
  atual. Precisa de decisão própria (prefixo no Firestore × serviço de busca) — spec futura.
- Contagem total de registros: no Firestore custa uma agregação à parte; "carregar mais" não precisa dela.
- Migrar a listagem de usuários: carrega o N+1 do Admin SDK (`user.repository.ts:42-46`), que merece
  tratamento separado. Filtros compostos arbitrários na API — cada um exige índice; entram por demanda.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | **Breaking change** no contrato de `list()` dos recursos migrados: array cru → envelope paginado. |
| `apps/api` | `BaseRepository` ganha leitura paginada; rotas de listagem passam a aceitar e devolver cursor, com teto de tamanho no servidor. |
| `apps/app` | Hooks `useListX` e a tela de `entities` passam a paginar; padrão novo a ser copiado pelos forks. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: `Table` com paginação controlada pelo servidor. `internationalization`: rótulos de "carregar mais"/vazio nos 3 idiomas. |
| Infra/env | Índices compostos versionados no arquivo de índices do Firestore (hoje vazio). Nenhum serviço novo, nenhuma env nova, nenhum custo. |

## Riscos e trade-offs

- **Quebra de contrato do SDK.** Forks que já consomem `list()` precisam se adaptar — argumento a favor de
  fazer isso **agora**, com um recurso de exemplo e não dez.
- **Índice que falha só em runtime** (prática 11): passa em desenvolvimento com poucos dados e quebra em
  produção. Sem exercitar as consultas contra o emulador (`firebase-emulator-seed`), o risco sobrevive.
- **Ordenação instável corrompe a navegação**: sem desempate determinístico, registros criados no mesmo
  instante somem ou repetem entre páginas — bug que só aparece com volume.
- **Dependência de `firestore-admin-access`:** hoje o acesso é pelo client SDK
  (`apps/api/(shared)/infra/dabatase.ts:1-15`); a migração para o Admin SDK reescreve exatamente estes
  métodos. Paginar antes é escrever o mesmo código duas vezes.
- **Custo herdado por todo fork:** paginar é mais código que `findAll()` e a UI perde "pular para a página
  N" — mas nenhum serviço, env ou custo em dinheiro. Mitigação: o padrão vem pronto no slice `entity`.

## Sinais de pronto

- Uma coleção com milhares de documentos abre a tela lendo apenas uma página; navegar adiante lê outra.
- A resposta da API não cresce com o tamanho da coleção, mesmo que o cliente peça um tamanho absurdo.
- Percorrer todas as páginas de uma lista com registros de mesmo instante de criação não repete nem
  perde nenhum registro.
- Toda consulta usada pelo slice de referência tem índice declarado no repositório antes do deploy.

## Perguntas em aberto

- Cursor opaco ou identificador do último documento exposto? — **recomendação:** opaco, para mudar a
  ordenação depois sem quebrar clientes.
- Migrar `entity` e `user` no mesmo corte? — **recomendação:** só `entity`; o N+1 de `user` contaminaria
  a avaliação do padrão.
- Manter `findAll()` para listas pequenas ou removê-lo? — **recomendação:** manter, com nome que declare
  o risco, para que ler tudo seja escolha consciente.
