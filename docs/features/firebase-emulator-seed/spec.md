---
id: firebase-emulator-seed
title: Emulador do Firebase, seed e primeiro admin
status: done
value: alto
effort: M
audience: dx
area: [raiz, apps/api, apps/app, packages/auth]
mode: ambos
depends_on: [firestore-admin-access]
contends_on: [firebase.json, package.json, packages/auth/server.ts]
feature: firebase-emulator-seed
updated: 2026-09-16
---

# Emulador do Firebase, seed e primeiro admin

> **Entregue.** PR **#13** mergeada em `main` em 2026-09-15T20:44:44Z (merge commit `8107f3f`), CI
> `success` nesse SHA. Os **5 itens do corte** foram reconferidos um a um no código na auditoria de
> **2026-09-16**, e a evidência de cada um está marcada na própria lista do corte, mais abaixo.
>
> O texto desta spec foi escrito **antes** da entrega e descrevia um repositório onde nada disso existia.
> A seção "O que já existe no repo" foi reescrita na auditoria para não ficar negando o commit que a
> fechou; o resto do documento — problema, evidência de mercado, riscos — é o original, porque é o
> registro do raciocínio que levou à entrega.

## Problema

Para rodar este boilerplate hoje é preciso um projeto Firebase real, provisionado no console. Isso traz
três problemas para quem forka: **não dá para desenvolver sem conta e sem internet**; **todo mundo escreve
no mesmo banco**, então um teste de alguém apaga o dado de outro; e **não existe estado inicial
reprodutível** — cada máquina começa diferente. Pior: o painel administrativo é inalcançável, porque não há
caminho em código para criar o primeiro admin. Quem clona o repo cria uma conta comum e descobre que a área
admin — uma das razões de existir deste boilerplate — só abre editando um documento no console à mão.

## O que existe no repo (reescrito na auditoria de 2026-09-16, pós-entrega)

- `firebase.json:9-21` — o bloco `emulators` existe: `auth` na porta 9099 (`:10-12`), `firestore` na 8080
  (`:13-15`), a UI na 4001 (`:16-19`) e `singleProjectMode` (`:20`). O `storage` de `file-upload-storage`
  segue em `:6-8`. O arquivo passou de 9 para 22 linhas.
- `apps/api/scripts/seed-emulator.mjs` — o seed: três contas em `:21-25` (um admin, dois comuns), registros
  de `entity` por dono em `:32-87`, `wipe()` em `:89-104` e `main()` em `:148-176`. Exposto como
  `pnpm seed` (`package.json:15` → `apps/api/package.json:14`).
- `apps/api/scripts/emulatorTarget.mjs:26-45` — a trava. `refuseSeedReason` recusa rodar sem os dois hosts
  de emulador preenchidos, ou contra project id que não comece por `demo-`. É o que torna seguro publicar
  a senha do seed na documentação.
- `packages/auth/emulator.ts` — o predicado único de "estou falando com o emulador?", consumido pelo Admin
  SDK (`packages/auth/server.ts:13,43-45`) e pelo SDK de browser (`packages/auth/client.ts:23,99-102`).
- `docs/SETUP.md:211-274` — a seção "Emulador do Firebase (caminho local padrão)", com o estado que o seed
  cria (`:226`), as credenciais (`:240-241`) e como sair do emulador (`:251-254`). O caminho do projeto
  real virou a alternativa de quem vai publicar (`## Firestore` em `:190`).
- `apps/api/(shared)/infra/database.ts:1-5` — desde 2026-08-31 (`firestore-admin-access`) a conexão é uma
  única linha: `getFirestoreAdmin()` de `@repo/auth/server`, sem configuração hardcoded. Foi o que tornou
  o ponto de conexão do emulador barato: o Admin SDK lê `FIRESTORE_EMULATOR_HOST` do ambiente, sem
  ramificação no código de infra.
- `firestore.rules:32-33` — negação total (`allow read, write: if false`), **publicada e em vigor**, e
  ainda **não exercitada por teste de rules**. O emulador, que era o pré-requisito, passou a existir; a
  suíte de rules em si ficou de fora do corte de propósito (ver "Fora do corte") e segue pendente.
  > ✅ **Verificado em 2026-09-11: as rules ESTÃO publicadas.** A leitura REST direta com a chave pública
  > devolve **HTTP 403** — a negação está valendo. Medido com o comando de
  > `docs/SECURITY.md:66-69` contra o projeto `next-boilerplate-576d0`, e reconferido em 2026-09-14.
  >
  > **E é justamente esse episódio que dá o melhor argumento a esta spec.** Durante onze dias,
  > `docs/SECURITY.md` e `docs/PRE-PRODUCTION.md` afirmaram exatamente o contrário — que as rules nunca
  > tinham sido publicadas e que a base estava "legível e gravável por qualquer pessoa com a chave
  > pública". **Não procure o erro nos arquivos de hoje:** os dois documentos foram reescritos no commit
  > `9154776`, e as versões atuais dizem o certo — com um aviso explícito de que as anteriores mentiam. O
  > erro vive no histórico do git, não na árvore de trabalho. O que interessa é o que o episódio revelou:
  > **nada no repositório foi capaz de desmentir a afirmação falsa enquanto ela esteve lá** — nem os 668
  > testes, nem o `typecheck`, nem o CI. A pergunta "as regras de acesso do banco estão valendo?" só pôde ser respondida
  > por um `curl` manual, feito à mão, contra um projeto real, por alguém que desconfiou. É esse buraco
  > que o emulador fecha: com teste de rules, a resposta vira automática e a documentação não consegue
  > divergir da realidade por onze dias sem que uma PR fique vermelha. O valor desta spec **não** é
  > descobrir se as rules valem — é tornar impossível que ninguém saiba.
- **Continuam sendo duas rules files sem teste de rules.** `file-upload-storage` (PR #11, `9154776`)
  acrescentou `storage.rules` na raiz — também `deny-all` (`:26-28`), e, pior que o `firestore.rules`,
  **nunca publicado**: o Cloud Storage sequer está ativado no projeto de referência, e
  `docs/PRE-PRODUCTION.md:106` mantém "`storage.rules` publicado" como item em aberto. O que mudou com
  esta entrega é que o emulador de Storage não chegou junto — ele ficou de fora do escopo —, mas
  `apps/api/__tests__/storageEmulatorIsolation.test.ts` passou a provar que, sob emulador, nada escapa
  para um bucket real. Continua faltando exercitar a regra em si, com
  `@firebase/rules-unit-testing`, que a spec `e2e-testing` herda.
- **O impasse do primeiro admin pelo produto continua de pé, e é de propósito:**
  `apps/api/app/(routes)/auth/sign-up/route.ts:34` cria o perfil com `type: UserType.COMMON` fixo; e a
  única rota que cria usuário com outro tipo, `apps/api/app/(routes)/users/route.ts:34`, está atrás de
  `requireAdminApi`. Quem quebra o impasse é o caminho de bootstrap fora do HTTP, não uma rota nova.
- **Bootstrap do primeiro admin: fechado nos dois ambientes.**
  `apps/api/scripts/create-dev-admin.mjs` continua idempotente (`ensureAuthUser` `:66`,
  `ensureAdminProfile` `:87`) e exposto em `apps/api/package.json:13`, mas agora importa
  `readEmulatorTarget`/`isRealProjectTarget` (`:4`): contra o emulador dispensa service account
  (`initializeTarget()` `:117-121`), e contra projeto real exige consentimento escrito — a flag
  `--allow-real-project` (`:6`, `:29-31`, `:129-133`). O padrão passou a ser recusar.
- `packages/sdk/src/types/user/user.ts:2-5` — os dois tipos (`admin`, `common`) existem no contrato.

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

Os 5 itens abaixo foram reconferidos no código em **2026-09-16**, com a evidência de cada um ao lado.

- [x] `pnpm install` seguido de um comando sobe o stack local inteiro contra um Firebase **emulado** —
      sem conta, sem projeto provisionado, sem internet e sem tocar em dado real.
      → bloco `emulators` em `firebase.json:9-21`; `pnpm emulators` em `package.json:14`;
      `firebase-tools` fixada em `package.json:31`; os três `.env.example` já apontam para os hosts
      (`apps/api/.env.example:10-11`, `apps/app/.env.example:10-11`, `apps/web/.env.example:18-19`).
      O reconhecimento do emulador mora num predicado único, `packages/auth/emulator.ts:27-32`, consumido
      pelo Admin SDK (`packages/auth/server.ts:43-45`) e pelo cliente (`packages/auth/client.ts:99-102`).
- [x] Um comando popula o ambiente emulado com um estado inicial conhecido: um usuário admin, ao menos um
      usuário comum e alguns registros do recurso de referência `entity`, com credenciais documentadas.
      → `apps/api/scripts/seed-emulator.mjs:21-25` (admin + 2 comuns), `:32-87` (6 registros de `entity`
      cobrindo os tipos, um desabilitado, descrição vazia e campos nulos), `main()` em `:148-176`;
      `pnpm seed` em `package.json:15`; credenciais em `docs/SETUP.md:226-241`.
- [x] Existe um caminho **de código** para criar o primeiro admin, executável tanto no emulador quanto num
      projeto real recém-criado, sem editar documento à mão no console.
      → `apps/api/scripts/create-dev-admin.mjs:4` importa o alvo, `:117-121` dispensa service account sob
      emulador e `:129-133` exige `--allow-real-project` contra projeto de verdade. No emulador o próprio
      seed já entrega `admin@example.com` (`docs/SETUP.md:281`).
- [x] O ambiente emulado é redefinível: um comando devolve o estado inicial após um teste destrutivo.
      → `seed-emulator.mjs:89-104` (`wipe()`, que apaga contas e documentos pelos endpoints
      `/emulator/v1/` antes de repovoar) chamado em `:153`. Reset e seed são o mesmo comando, registrado
      em `docs/SETUP.md:236`.
- [x] `docs/SETUP.md` passa a ter o caminho local (emulador) como padrão, e o projeto real como o caminho
      de quem vai publicar.
      → seção "Emulador do Firebase (caminho local padrão)" em `docs/SETUP.md:211-274`, o passo a passo
      curto em `:105-110`, o JDK 21 nos pré-requisitos em `:12`, e o caminho do projeto real rebaixado a
      `## Firestore` em `:190`.

**Item que a entrega acrescentou por fora do corte:** as 9 configs do Vitest ganharam
`testTimeout: 20_000` (de `apps/api/vitest.config.mts:11` a `packages/shared/vitest.config.mts:10`). Não
estava na spec; entrou porque o gate estava falhando 1 em 2 execuções e o emulador ia acrescentar testes.

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
- ✅ **Dependência de `firestore-admin-access` satisfeita em 2026-08-31.** O arquivo de conexão foi
  reescrito lá (`apps/api/(shared)/infra/database.ts`) e a API já roda com privilégio de serviço, que é o
  que o bootstrap de admin exigia. **Esta spec está desbloqueada** — e o argumento a favor dela ficou mais
  forte, não mais fraco: as rules agora estão publicadas em `deny-all` e ninguém as testa.
- **Custo herdado por todo fork:** **zero em dinheiro** e nenhuma env obrigatória — a ausência da variável
  do emulador deve significar "usar o Firebase real", no mesmo no-op que `packages/security/index.ts:42-44`
  aplica ao `ARCJET_KEY`. Herda-se, isso sim, o runtime Java exigido pelos emuladores, que precisa entrar
  nos pré-requisitos.

## Sinais de pronto

- Numa máquina limpa, sem conta Firebase e sem rede, é possível clonar, instalar, subir e fazer login no
  app com um usuário do seed.
- É possível entrar na área administrativa sem abrir o console do Firebase nenhuma vez.
- Rodar um fluxo destrutivo e depois redefinir o ambiente devolve exatamente o mesmo estado inicial.
- Nenhum dado de um projeto Firebase real é lido ou escrito durante o desenvolvimento local padrão.

## Perguntas em aberto — respondidas na entrega

As três já vinham com recomendação e a entrega adotou as três como estavam, dentro de um `/cycle`
autônomo. Ficam registradas com o que foi decidido:

- O emulador deve ser o **default** do desenvolvimento local ou um modo à parte? — **default**, como
  recomendado. Usar Firebase real exige esvaziar o bloco do emulador nos três `.env`
  (`docs/SETUP.md:251-254`).
- Bootstrap do primeiro admin por comando explícito ou promoção automática do primeiro cadastrado?
  — **comando explícito**, como recomendado. Não há promoção automática em lugar nenhum do código.
- Persistir o estado do emulador entre execuções ou reconstruir do seed? — **reconstruir**, como
  recomendado: `wipe()` roda antes de cada seed e o estado morre com o processo do emulador.

Três desvios em relação ao planejado, decididos durante a implementação e registrados no
`develop/handoff.md` desta feature: o JDK mínimo virou **21+** (o `firebase-tools` recusa versões
anteriores), a UI do emulador foi para a porta **4001** (uma porta ocupada aborta o `emulators:start`
inteiro, derrubando junto Auth e Firestore) e a CSP ganhou as origens do emulador em `frameSrc`.
