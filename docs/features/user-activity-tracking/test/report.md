# Relatório de QA — Último acesso do usuário

Rodada autônoma do `/cycle`, na branch `feat/user-last-access`, com a feature inteira na árvore de trabalho.
Nenhum commit e nenhuma branch criada aqui.

O trabalho foi dirigido pelas quatro lacunas que a revisão deixou anotadas, não por uma nova varredura do
diff: a revisão já mediu a janela, o carimbo do ator e os três estados da coluna contra o emulador.

## Placar

18 critérios de aceite, todos ✅. Nenhum ❌ e nenhum 🔒. O detalhamento item a item, com a evidência de cada
um, está em [`criterios-aceite.md`](criterios-aceite.md).

O critério 4 mudou de texto. O plano prometia teto rígido de uma escrita por janela; a revisão mediu duas
escritas na mesma janela vindas de um par de requisições concorrentes. O critério agora descreve piso e
teto, e o teste novo da corrida fixa esse contrato.

Nenhum defeito de produção encontrado.

## Testes criados

Quatorze casos na `apps/api`, três na `apps/app`. Todos de unidade ou de componente, sem processo externo.

| lacuna | arquivo | casos | nível |
|--------|---------|-------|-------|
| mutação autorizada carimbando | `apps/api/__tests__/guardsStampActivity.test.ts` | 4 | guard com `vi.mock` do repositório |
| a corrida de duas requisições | `apps/api/__tests__/activityRecorder.test.ts` | 2 | unidade, timers falsos |
| descarte em `DEDUPE_CACHE_MAX` | `apps/api/__tests__/activityRecorder.test.ts` | 3 | unidade, timers falsos |
| formato de data em `en` e `es` | `apps/app/__tests__/usersListLastAccess.test.tsx` | 3 | componente |
| `updatedAt` intocado pelo carimbo | `apps/api/__tests__/baseRepository.test.ts` | 3 | repositório sobre driver falso |
| `lastAccessAt` serializado no merge | `apps/api/__tests__/userProfileSerialization.test.ts` | 2 | função pura |

As duas últimas linhas não estavam na lista da revisão. Entraram porque os critérios 10 e 11 dependiam só
de leitura de código mais a observação da revisão contra o emulador, e as duas invariantes são fáceis de
quebrar num refactor: trocar `touchLastAccess` por `BaseRepository.update` moveria `updatedAt`, e um
`lastAccessAt` que não passasse por `serializeFirestoreValue` chegaria à tela como `Invalid Date`.

### Por que nenhum teste de faixa cara

Nenhuma das lacunas tem a infra como objeto. A corrida se prova com duas chamadas concorrentes e cache
frio, porque o que a produz é o cache ser escrito depois do retorno da escrita, não o Firestore. O descarte
do cache é uma `Map` com limite. O formato de data é `Intl` mais o cookie de idioma. `updatedAt` e a
serialização passam pelo driver falso que `baseRepository.test.ts` já mantém, o mesmo que cobre `update`,
`delete` e paginação por cursor.

O que só o emulador provaria, a serialização do documento real de volta ao cliente, a revisão já observou
com a API de pé: o `Timestamp` do Firestore chegou formatado na tela. Repetir isso com um teste de emulador
acrescentaria um processo externo ao `pnpm test` e ao CI para reprovar o mesmo defeito duas vezes.

### Dois testes foram verificados por mutação

Teste que passa sem exercitar nada é pior que teste ausente, então os dois casos mais fáceis de passar por
acidente foram checados contra uma alteração temporária, revertida em seguida:

- trocar `touchLastAccess` por `this.update(...)` derruba "leaves updatedAt on the instant of the last real
  edit";
- trocar o idioma do caso de `en` para `pt-br` derruba "uses the English header, absence text and date
  format".

## Comandos e resultados

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` | 576 testes em 50 arquivos, verde (eram 562 antes desta rodada) |
| `pnpm --filter app test` | 389 testes em 54 arquivos, verde (eram 386) |
| `pnpm --filter @repo/internationalization test` | 27 testes em 3 arquivos, paridade dos 3 idiomas |
| `pnpm test` | 10 tarefas do turbo, todas verdes |
| `pnpm turbo run lint typecheck test --force` | 24/24 tarefas, 0 em cache, 37,0 s |
| `pnpm check` | 611 arquivos, nenhuma correção pendente |

`pnpm test` na raiz é o gate que importa aqui, porque `turbo build` depende de `test`.

O primeiro `pnpm check` desta rodada reprovou: a regra `lint/suspicious/noDocumentCookie` do Biome pegou o
`document.cookie` que o teste de idioma usava para trocar o locale. Corrigido usando `setCookie` de
`@repo/shared/utils/helpers/cookies`, que é o helper de produção e já carrega a dispensa da regra. O teste
passou a exercitar o mesmo caminho que o app usa.

## Evidência de tela

Não subi app nem emulador. A validação visual desta feature é a da revisão, em `review/screenshots/`: três
estados da coluna em light e dark, mobile 390x844, os três idiomas, contraste do texto atenuado medido em
6,87:1 no dark e 4,54:1 no light, e o percurso de impersonação com leitura dos documentos pela REST do
emulador.

Essa evidência continua valendo para a árvore atual: desde aquela execução, os únicos arquivos alterados são
os cinco de teste listados acima. Nenhum arquivo de produção mudou.

## Ambiente e portas

Nada foi iniciado. As portas 3000, 3001, 3002, 3003, 9099, 8080 e 4001 estavam livres antes e continuam
livres depois, conferidas com `lsof -ti tcp:<porta>`.

Nenhuma conta de QA criada, nenhum documento do Firestore escrito, nenhum dado de dev alterado. Nada a
limpar por conta desta etapa.

## O que fica em aberto

- **Comportamento em base grande.** A listagem lê todos os perfis e faz o join com o Auth por usuário, o que
  é anterior a esta feature e não foi exercitado com volume. A coluna não ordena nem filtra no servidor,
  então ela não acrescenta consulta, mas a página herda o custo que já existia.
- **A corrida em N instâncias.** O teste fixa o comportamento de duas chamadas concorrentes num processo. Em
  produção, na Vercel, o número de escritas extras por janela é o paralelismo do momento. O número medido
  contra o emulador está em `docs/PRE-PRODUCTION.md`.
- **O `title` como único aviso de valor aproximado.** Leitor de tela não anuncia de forma confiável e touch
  não alcança. A revisão decidiu manter neste corte; o aviso deixa de ser necessário quando a coluna tiver
  uma origem só.

## Para o plano de commits

O plano da revisão lista `activityRecorder.test.ts` no commit 2, `guardsStampActivity.test.ts` no 3 e
`usersListLastAccess.test.tsx` no 5, e os casos novos entram neles sem mudança. Os outros dois arquivos não
estavam previstos:

- `apps/api/__tests__/baseRepository.test.ts` acompanha o commit 2, que é onde `touchLastAccess` entra;
- `apps/api/__tests__/userProfileSerialization.test.ts` também, já que prova a serialização do campo que o
  commit 1 declarou no contrato.
