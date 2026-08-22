---
id: firebase-emulator-seed
title: Emulador do Firebase, seed e primeiro admin
status: proposed
value: alto
effort: M
audience: dx
area: [raiz, apps/api, apps/app, packages/auth]
mode: ambos
depends_on: [firestore-admin-access]
feature: -
updated: 2026-08-22
---

# Emulador do Firebase, seed e primeiro admin

> **Nota de auditoria (2026-08-22):** 1 dos 5 itens do corte foi entregue **por fora desta spec** — o
> bootstrap do primeiro admin (`apps/api/scripts/create-dev-admin.mjs`, vindo de
> `docs/features/impersonation-read-only/`), e só contra projeto real. Entrega parcial órfã: o restante do
> corte (emulador, seed, reset, `docs/SETUP.md`) segue pendente.

## Problema

Para rodar este boilerplate hoje é preciso um projeto Firebase real, provisionado no console. Isso traz
três problemas para quem forka: **não dá para desenvolver sem conta e sem internet**; **todo mundo escreve
no mesmo banco**, então um teste de alguém apaga o dado de outro; e **não existe estado inicial
reprodutível** — cada máquina começa diferente. Pior: o painel administrativo é inalcançável, porque não há
caminho em código para criar o primeiro admin. Quem clona o repo cria uma conta comum e descobre que a área
admin — uma das razões de existir deste boilerplate — só abre editando um documento no console à mão.

## O que já existe no repo

- `firebase.json:1-6` — o arquivo inteiro aponta apenas `firestore.rules` e `firestore.indexes.json`.
  **Não há bloco de emuladores**, nem hosting, functions ou storage.
- Não existe **nenhum** script de seed, fixture ou dado de demonstração: buscar por `seed`/`emulator` no
  código-fonte retorna apenas menções em notas de pesquisa e documentação de agents.
- `docs/SETUP.md:111-114` — a seção "Firestore" instrui a provisionar no Firebase Console em **modo de
  produção** e fazer deploy das regras. Não menciona emulador, seed nem primeiro admin.
- `apps/api/(shared)/infra/dabatase.ts:1-17` — a conexão usa o Firebase **client SDK** com configuração
  pública **hardcoded** (chave, projeto, bucket). É por aqui que o emulador seria conectado, e
  `docs/SETUP.md:120` já registra isso como dívida de higiene.
- `firestore.rules:30-32` — negação total (`allow read, write: if false`), **nunca exercitada por teste**.
  O próprio arquivo avisa (12-18) que publicar essa regra com a API no client SDK derruba a API.
- **O impasse do primeiro admin, em código:** `apps/api/app/(routes)/auth/sign-up/route.ts:34` cria o
  perfil com `type: UserType.COMMON` fixo; e a única rota que cria usuário com outro tipo,
  `apps/api/app/(routes)/users/route.ts:34`, está atrás de `requireAdminApi`. Ou seja: **pelo produto, para
  criar um admin é preciso já ser admin.**
- **Bootstrap do primeiro admin: entregue, mas só contra projeto real.**
  `apps/api/scripts/create-dev-admin.mjs` (idempotente: `ensureAuthUser` `:48-67`,
  `ensureAdminProfile` `:69-97`), exposto em `apps/api/package.json:11`. Foi entregue por fora desta spec,
  em `docs/features/impersonation-read-only/`. **Exige credenciais `FIREBASE_ADMIN_*` de service account
  reais** (`:31-46`) e não conhece emulador — o item do corte que pede "executável tanto no emulador quanto
  num projeto real" está **metade feito**.
- `packages/sdk/src/types/user/user.ts:2-5` — os dois tipos (`admin`, `common`) existem no contrato.
- **Lacuna:** nenhum ambiente local isolado, nenhum estado inicial, e o caminho do primeiro admin existe
  só para quem já tem projeto real provisionado.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 4 (seed / dados de demo)** — *consolidada*, esforço P–M; a dor que evita é exatamente a daqui:
  "onboarding de dias; ambiente irreprodutível".
- **Prática 3 (testes de regras do Firestore)** — **obrigatória com Firebase** e uma das quatro
  indispensáveis: com Firebase a autorização *mora* nas rules, e sem teste é autorização não verificada.
  Esse teste roda **sobre o emulador** — o que faz do emulador pré-requisito, não conforto. Armadilhas que
  a proposta absorve: semear exige desabilitar as rules temporariamente, e cachear os binários evita
  baixá-los a cada execução automatizada.
- Custo: a nota lista emulador e seed entre os itens de **zero custo em dinheiro**.

## Proposta — corte de MVP

- [ ] `pnpm install` seguido de um comando sobe o stack local inteiro contra um Firebase **emulado** —
      sem conta, sem projeto provisionado, sem internet e sem tocar em dado real.
- [ ] Um comando popula o ambiente emulado com um estado inicial conhecido: um usuário admin, ao menos um
      usuário comum e alguns registros do recurso de referência `entity`, com credenciais documentadas.
- [ ] Existe um caminho **de código** para criar o primeiro admin, executável tanto no emulador quanto num
      projeto real recém-criado, sem editar documento à mão no console. — **metade feito:** o script existe
      (`apps/api/scripts/create-dev-admin.mjs`) e cobre o projeto real; falta o caminho pelo emulador.
- [ ] O ambiente emulado é redefinível: um comando devolve o estado inicial após um teste destrutivo.
- [ ] `docs/SETUP.md` passa a ter o caminho local (emulador) como padrão, e o projeto real como o caminho
      de quem vai publicar.

### Fora do corte

- Testes automatizados das security rules (prática 3): este corte entrega o **pré-requisito**; a suíte é
  trabalho próprio e faz mais sentido junto do `ci-pipeline` que a executa.
- Emular serviços além de Auth e Firestore; seed com volume grande para teste de carga (entra quando
  `cursor-pagination` precisar exercitar páginas); promover/rebaixar admin pela interface do painel, que
  é funcionalidade de produto e não bootstrap.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Conexão com o Firestore passa a reconhecer o emulador; ganha um caminho administrativo de bootstrap fora do fluxo HTTP autenticado. |
| `apps/app` | Nenhum código; passa a ter área admin acessível localmente no primeiro dia. |
| `apps/web` | N/A. |
| `packages/*` | `auth`: reconhecer o emulador de Auth. Nenhuma mudança de API pública. |
| Infra/env | Configuração de emuladores no `firebase.json`; scripts na raiz; variáveis que apontam para o emulador nos `.env.example`; documentação em `docs/SETUP.md`. |

## Riscos e trade-offs

- **Divergência emulador × produção.** O emulador não reproduz cotas, latência, índices compostos exigidos
  nem toda a semântica de regras — em especial o índice que falha só em runtime (ver `cursor-pagination`).
  É rede de segurança, não certificado de produção.
- **O seed vira dívida se envelhecer.** Um estado inicial que não acompanha o modelo quebra e ninguém
  conserta, porque "é só o seed". Precisa ser exercitado por algo automatizado para se manter vivo — outro
  motivo para andar junto com `ci-pipeline`.
- **Credencial de demonstração é armadilha de segurança**: um fork que rode o seed em produção cria um
  admin com senha conhecida. O bootstrap tem de ser inofensivo por padrão fora do ambiente local, e isso
  precisa estar escrito, não implícito.
- **Dependência de `firestore-admin-access`:** o ponto de conexão é o mesmo arquivo que aquela spec
  reescreve (`apps/api/(shared)/infra/dabatase.ts`), e o bootstrap de admin exige privilégio de serviço,
  que só o Admin SDK dá. Resolver a conexão aqui seria refazer o trabalho lá.
- **Custo herdado por todo fork:** **zero em dinheiro** e nenhuma env obrigatória — a ausência da variável
  do emulador deve significar "usar o Firebase real", no mesmo no-op que `packages/security/index.ts:16-18`
  aplica ao `ARCJET_KEY`. Herda-se, isso sim, o runtime Java exigido pelos emuladores, que precisa entrar
  nos pré-requisitos.

## Sinais de pronto

- Numa máquina limpa, sem conta Firebase e sem rede, é possível clonar, instalar, subir e fazer login no
  app com um usuário do seed.
- É possível entrar na área administrativa sem abrir o console do Firebase nenhuma vez.
- Rodar um fluxo destrutivo e depois redefinir o ambiente devolve exatamente o mesmo estado inicial.
- Nenhum dado de um projeto Firebase real é lido ou escrito durante o desenvolvimento local padrão.

## Perguntas em aberto

- O emulador deve ser o **default** do desenvolvimento local ou um modo à parte? — **recomendação:**
  default; usar Firebase real exige escolha explícita.
- Bootstrap do primeiro admin por comando explícito ou promoção automática do primeiro cadastrado?
  — **recomendação:** comando explícito; promoção automática é risco discreto em produção.
- Persistir o estado do emulador entre execuções ou reconstruir do seed? — **recomendação:** reconstruir
  por padrão; reprodutibilidade é o ponto do exercício.
