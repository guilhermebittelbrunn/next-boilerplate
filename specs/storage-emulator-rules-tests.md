---
id: storage-emulator-rules-tests
title: Emulador de Cloud Storage e testes das security rules
status: in-progress
value: alto
effort: M
audience: dx
area: [apps/api, apps/e2e, packages/auth]
mode: ambos
depends_on: []
contends_on: [firebase.json, package.json, turbo.json, apps/api/(shared)/lib/storage.ts, .github/workflows/ci.yml]
feature: storage-emulator-rules-tests
updated: 2026-09-27
---

# Emulador de Cloud Storage e testes das security rules

## Problema

O upload de arquivo e o avatar da conta foram entregues sem nunca terem rodado neste repositório. O ambiente
local e o CI emulam Auth e Firestore, mas não o Cloud Storage, e a API desliga o Storage de propósito quando
roda contra emuladores, para não gravar num bucket real por engano. Resultado: todo fork que usa upload
recebe código cujo caminho feliz ninguém executou, e o passo de apagar arquivos na exclusão de conta também
fica sem prova.

As duas security rules do projeto (`firestore.rules` e `storage.rules`) também não têm teste. Hoje ambas
negam tudo, e é isso que protege o banco e o bucket de acesso direto pelo cliente. Nada impede um fork de
abrir uma coleção sem perceber.

## O que já existe no repo

- `firebase.json:6-8` declara só o arquivo de rules do Storage; os emuladores configurados são `auth`
  (`:10-12`) e `firestore` (`:13-15`). `package.json:14` sobe `--only auth,firestore`, e é esse script que a
  suíte E2E usa (`apps/e2e/playwright.config.ts:59-60`).
- `apps/api/(shared)/lib/storage.ts:25-32`: `isStorageConfigured()` devolve `false` sempre que a stack está
  emulada. O comentário explica o motivo: sem emulador de Storage, um bucket preenchido receberia objetos
  reais com as credenciais padrão da máquina. `apps/api/.env.example:34-35` repete o aviso.
- `apps/api/(shared)/lib/storage.ts:53-111` concentra escrita, URL assinada (`getSignedUrl` v4, `:75`),
  remoção e listagem por prefixo. É o módulo que as rotas de arquivo e o expurgo de conta usam
  (`apps/api/(shared)/lib/account-erasure.ts:56-68`, `eraseStorage`, passo `storage`).
- `firestore.rules:32-34` e `storage.rules:26-29`: uma regra de negação total cada. `grep` por
  `rules-unit-testing`, `assertFails` e `assertSucceeds` em código (fora de `node_modules`, `docs/` e `specs/`): 0.
- A entrega de [`file-upload-storage`](../docs/features/file-upload-storage/test/report.md) fechou com 6 critérios
  "não verificados" pelo Storage não estar ativo (`test/report.md:138`, `STATE.md:18`), e [`account-settings`](../docs/features/account-settings/spec.md)
  com o caminho feliz do avatar sem verificação. As pendências 11 e 18 do `BACKLOG.md` ("Cloud Storage não
  ativado", "`storage.rules` nunca publicado nem testado") seguem abertas pelo mesmo motivo.
- **Lacuna:** nenhum ambiente reproduzível onde upload, leitura por URL assinada e remoção de arquivos rodem
  de verdade, e nenhum teste que falhe se alguém afrouxar as rules.

### Por que reabrir uma lacuna descartada

"Emular Cloud Storage" e "testes de security rules" ficaram fora do corte de `firebase-emulator-seed` e de
`e2e-testing`, e a seção de lacunas do backlog os deixou "sem dono, candidatos a spec numa próxima
descoberta". O argumento novo é o acúmulo: duas specs entregues carregam critérios que só um Storage
funcionando prova, o expurgo de conta depende dele, e a suíte E2E já existe e já sobe emuladores no CI, então
o custo marginal de incluir mais um caiu.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md), prática 3 e adendo de
  2026-09-26.
- A prática 3 ("testes de security rules") é classificada como **obrigatória com Firebase**: a doc do
  Firebase trata as rules como a única barreira contra acesso direto do cliente.
- O Admin SDK se conecta ao emulador de Storage só com `FIREBASE_STORAGE_EMULATOR_HOST`
  (<https://firebase.google.com/docs/emulator-suite/connect_storage>, consultado em 2026-09-26), e
  `@firebase/rules-unit-testing` cobre Storage além de Firestore
  (<https://firebase.google.com/docs/rules/unit-tests>).
- Prevalência entre starters não se aplica: é prática de stack, não recurso de produto.

## Proposta — corte de MVP

- [ ] `pnpm emulators` sobe também o Storage, e a API usa o bucket emulado quando a stack está emulada, sem
      nunca apontar para um bucket real nesse modo.
- [ ] O upload de imagem, a leitura pela URL devolvida e a remoção rodam sob o emulador e têm teste
      automatizado que prova o caminho feliz e a recusa de dono errado.
- [ ] O passo `storage` do expurgo de conta roda sob o emulador e apaga os objetos do titular.
- [ ] Teste das duas security rules sob o emulador: leitura e escrita de cliente autenticado e anônimo são
      recusadas no Firestore e no Storage. O teste falha se a regra de negação for afrouxada.
- [ ] Os testes das rules e do Storage emulado rodam dentro do `pnpm test`, e portanto no job `verify` do CI
      e antes de todo `pnpm build`.

### Decisão tomada

**Os testes de rules rodam dentro do `pnpm test`** (decisão do usuário em 2026-09-26). A recomendação
anterior era um comando próprio, chamado pelo job `e2e`, para manter os três gates herméticos; ela foi
descartada. As consequências estão em "Riscos e trade-offs" e são o `/analyze` que resolve.

### Fora do corte

- Publicar `storage.rules` e ativar o bucket num projeto real. Continua passo manual do fork
  (`docs/PRE-PRODUCTION.md` §6).
- Regras permissivas por coleção ou por dono. O repositório não acessa o Firestore pelo cliente, e escrever a
  primeira regra é decisão de cada fork; o teste de negação é a rede para quando isso acontecer.
- Promover administrador pela interface: já existe (campo de tipo no formulário de edição de usuário).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | O módulo de Storage deixa de se desligar quando o emulador de Storage está presente; testes de upload, URL assinada, remoção e expurgo. |
| `apps/app` | Nenhum código; o avatar passa a funcionar no ambiente local. |
| `apps/web` | N/A. |
| `packages/*` | `auth` só se a inicialização do Storage admin precisar saber do emulador. |
| Infra/env | Emulador de Storage no `firebase.json` e no script da raiz; variável de host do emulador no `.env.example` da API; a task `test` do turbo deixa de ser hermética; o job `verify` do CI passa a precisar de JDK 21, emulador e cache do JAR. |

## Riscos e trade-offs

- **URL assinada sob o emulador é não confirmada.** A doc do emulador não menciona `getSignedUrl`, e a
  assinatura v4 normalmente exige credencial de service account, que o projeto `demo-*` não tem. Se não
  funcionar, o `/analyze` precisa de um contorno que não mude o comportamento de produção.
- **A trava atual existe por um bom motivo.** O desligamento em `storage.ts:25-32` impede escrita num bucket
  real a partir do ambiente local. A mudança só pode liberar o Storage quando o host do emulador estiver
  presente, nunca apenas porque os outros emuladores estão.
- **O gate `test` deixa de ser hermético.** Com os testes de rules no `pnpm test`, rodar o gate passa a
  exigir emulador de pé e JDK 21, na máquina de quem desenvolve e no job `verify` do CI, que hoje roda
  `lint`, `typecheck` e `test` sem nenhum dos dois. O `/analyze` precisa decidir quem sobe o emulador para a
  task e como o `verify` ganha Java e o cache do JAR.
- **O `env: []` e o cache da task `test` no turbo precisam ser revistos.** Hoje a task é declarada hermética
  em relação a variáveis de ambiente e é cacheada. Um teste que depende de emulador pode ser servido do cache
  sem ter rodado contra ele, ou falhar por variável que o turbo não repassa. Isso é o que leva o `turbo.json`
  ao `contends_on`.
- **O `pnpm build` depende de `test`.** Qualquer build, local ou de deploy, passa a precisar do emulador, a
  menos que o `/analyze` separe o que o build exige do que o gate exige. Um build na plataforma de deploy
  sem JDK quebraria.
- **Mais um emulador no boot da suíte E2E** aumenta o tempo do job `e2e`; o JAR do Storage é baixado junto
  com os outros e o cache do CI já existe.
- Custo em dinheiro: zero. Nenhuma variável nova é obrigatória para quem não usa upload.

## Sinais de pronto

- Com a stack local de pé, o usuário troca o avatar na conta e vê a foto nova.
- O teste de upload falha se a rota aceitar arquivo de outro dono ou se a URL devolvida não abrir o objeto.
- Excluir uma conta com avatar apaga o objeto no bucket emulado.
- Mudar qualquer uma das duas rules para `allow read: if true` quebra um teste.
- `pnpm test` e o job `verify` do CI rodam os testes de rules e falham se o emulador não subir, em vez de
  passar sem tê-los executado.

## Perguntas em aberto

- Se o `getSignedUrl` não funcionar sob o emulador, aceitar prova só de escrita e remoção? —
  **recomendação:** não; o `/analyze` procura um contorno restrito ao modo emulado e, se não houver, a leitura
  vira critério 🔒 declarado.
