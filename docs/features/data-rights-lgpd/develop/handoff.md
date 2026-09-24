# Handoff do `/develop` — Direitos do titular: exportar dados e excluir conta

| | |
|---|---|
| Plano | [`analyze/plan.md`](../analyze/plan.md) |
| Data | 2026-09-23 |
| Branch | `kathmandu-v1` (não segue o padrão do repo; quem resolve é o `/review`) |
| Working tree | Sem commit, sem `git add`. O `git mv` de spec que a auditoria do backlog deixou preparado continua no índice, intocado |

## Blueprint → arquivos

### 1. `packages/sdk`

| Item do plano | Arquivo |
|---|---|
| `AccountDataExportDTO`, `AccountDataExportRecord`, `DeleteAccountRequest` | `src/types/account/account.ts` |
| `AuditAction.ACCOUNT_DATA_EXPORT`, `AuditAction.ACCOUNT_DELETE` | `src/types/audit/audit.ts` |
| `exportData()`, `deleteAccount(body)` | `src/actions/account/action.ts` |

`AccountActions` já estava registrada no `Client`, então não houve registro novo.

### 2. `packages/next-config` e env da web

| Item | Arquivo |
|---|---|
| `NEXT_PUBLIC_PRIVACY_CONTACT` (declaração canônica) | `packages/next-config/keys.ts` |
| Mesma chave no env da web, sem a qual ela não chega em runtime (ver desvio D-1) | `apps/web/env.ts` |
| Exemplo e documentação | `apps/web/.env.example`, `docs/SETUP.md` |

### 3. `apps/api` — exportação

| Item | Arquivo |
|---|---|
| `GET /account/export` | `app/(routes)/account/export/route.ts` |
| Montagem do dossiê, `EXPORT_MAX_RECORDS`, redação do rótulo de terceiro | `(shared)/lib/account-export.ts` |
| Leitura sem ordenação das entidades do titular | `(shared)/repositories/entity.repository.ts` (`findAllByUserId`) |
| Leitura sem ordenação da trilha do titular | `(shared)/repositories/audit-event.repository.ts` (`findAllByInvolvedUserId`) |
| Listagem de objetos por prefixo | `(shared)/lib/storage.ts` (`ownerPrefix`, `listObjectPaths`) |

### 4. `apps/api` — expurgo

| Item | Arquivo |
|---|---|
| `POST /account/deletion` | `app/(routes)/account/deletion/route.ts` |
| `deleteAccountSchema` + `parseDeleteAccount` | `(shared)/validation/account.schema.ts` |
| Detecção de conta sem provedor de senha | `(shared)/lib/auth-providers.ts` (`hasPasswordProvider`) |
| Orquestrador de 6 passos | `(shared)/lib/account-erasure.ts` (`runAccountErasure`) |
| `purge(id)` e `purgeAll(query)` | `(shared)/repositories/base.repository.ts` |
| `purgeProfile(id)` | `(shared)/repositories/user.repository.ts` |
| `purgeAllByUserId(userId)` | `(shared)/repositories/entity.repository.ts` |
| `anonymizeUserLabels(userId)` | `(shared)/repositories/audit-event.repository.ts` |
| Expurgo de objetos por prefixo | `(shared)/lib/storage.ts` (`deleteObjectsByPrefix`) |

### 5. `apps/api` — rate limit

`proxy.ts`: `/account/export` e `/account/deletion` entram em `RATE_LIMITED_PATHS`.

### 6. `apps/app`

| Item | Arquivo |
|---|---|
| Quinta aba `privacy` | `(pages)/account/(components)/AccountTabs.tsx` |
| Painel com os dois blocos | `(pages)/account/(components)/AccountPrivacyPanel.tsx` |
| Mutations de export e exclusão | `(pages)/account/(hooks)/useAccountDataRights.tsx` |
| `buildAccountDeletionSchema(dictionary)` | `(pages)/account/(validations)/accountDeletionSchema.ts` |
| Montagem do arquivo no cliente | `shared/lib/downloadJsonFile.ts` |
| Link para a política (extraído do `app/layout.tsx`, ver desvio D-8) | `shared/lib/privacyPolicyUrl.ts` |
| Navegação | `(common)/paths.ts` (`account.privacy`), `(common)/routes.tsx` (`settingsItems.privacy`) |
| Correção do duplo clique, na raiz | `shared/components/ui/Footer.tsx` (ver desvio D-7) |

### 7. `apps/web`

| Item | Arquivo |
|---|---|
| Canal de privacidade como prop opcional | `app/[locale]/legal/components/legal-document.tsx` |
| Resolução do canal, com `mailto:` ou `/contact` | `shared/lib/privacyContact.ts` |
| Página que passa o canal | `app/[locale]/legal/privacy/page.tsx` |

### 8. `packages/internationalization`

| Item | Arquivo |
|---|---|
| `tabs.privacy`, árvore `privacy.*`, `messages.dataExported`, `messages.accountDeleted` | `translations/apps/app/pages/common/account.ts` |
| `settingsItems.privacy` | `translations/apps/app/pages/common/routes/index.ts` |
| Rótulos de `account.data.export` e `account.delete` | `translations/apps/app/pages/admin/auditTrail.ts` |
| Seção de cookies, direitos reescritos, bloco `contact` | `translations/apps/web/pages/legal/index.ts` |
| Os 5 `apiErrors` novos | `translations/packages/shared/utils.ts` |

Chave a mais que o plano não previa: `privacy.policyLink`, o rótulo do link para a política que a aba mostra ao lado do prazo.

### 9. Documentação

`docs/PRE-PRODUCTION.md`: item 6 ganhou uma linha sobre o passo `storage` do expurgo e um item de checklist; o item 7 passou a apontar que o modelo já declara os cookies e ganhou `NEXT_PUBLIC_PRIVACY_CONTACT`; a declaração do `lastAccessAt` foi reescrita (deixou de dizer que a exclusão de verdade "ainda não foi implementada"); entrou uma declaração nova sobre até onde a exclusão alcança.

## Contrato e raio de impacto

| Símbolo | Quem consome |
|---|---|
| `AccountDataExportDTO`, `AccountDataExportRecord` | `apps/api` (rota de export), `apps/app` (hook) |
| `DeleteAccountRequest` | `apps/api` (rota de exclusão), `apps/app` (painel) |
| `AccountActions.exportData`, `AccountActions.deleteAccount` | só `apps/app` |
| `AuditAction.ACCOUNT_DATA_EXPORT`, `AuditAction.ACCOUNT_DELETE` | `apps/api` (grava), `apps/app` (rótulo na trilha do admin) |

Tudo é acréscimo. Nenhuma assinatura existente mudou, e os três typechecks passam.

Métodos novos de repositório que qualquer recurso futuro herda: `BaseRepository.purge` e `BaseRepository.purgeAll`, os dois `protected`. Um recurso novo que guarde dado do titular precisa entrar no `runAccountErasure` e no `buildAccountDataExport`, ou os dois passam a mentir sobre a cobertura.

## Códigos de erro novos

Os cinco têm entrada em `apiErrors` nos 3 idiomas, e `apps/app/__tests__/accountApiErrorCopy.test.ts` agora os inclui na lista que verifica tradução (22 casos, antes 17).

| `error.code` | Status | Quando |
|---|---|---|
| `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN` | 403 | Export chamado por admin personificando |
| `ACCOUNT_EXPORT_FAILED` | 500 | A montagem do dossiê falhou |
| `ACCOUNT_DELETION_CONFIRMATION_INVALID` | 400 | Corpo sem `currentPassword` utilizável |
| `ACCOUNT_DELETION_REAUTH_UNSUPPORTED` | 400 | Conta sem provedor de senha |
| `ACCOUNT_DELETION_FAILED` | 500 | O passo `authAccount` não concluiu |

## Desvios do plano

### D-1. `NEXT_PUBLIC_PRIVACY_CONTACT` precisou ser declarada também em `apps/web/env.ts`

O plano mandava declarar só em `packages/next-config/keys.ts`. Isso não funcionaria. Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core` devolve o `runtimeEnv` recebido e retorna antes de qualquer outra coisa; o merge de `extends` só acontece no caminho validado. Medido em `node_modules/.pnpm/@t3-oss+env-core@0.13.8_.../dist/src-Bb3GbGAa.js:36-37` (o `if (skip) return runtimeEnv;`) e `:70-74` (o `reduce` sobre `opts.extends`). O `apps/web/env.ts` usa `skipValidation: true`, e o comentário dele já registrava exatamente isso nas linhas 11-12.

Efeito colateral que a leitura expôs e que **não** corrigi, por estar fora da tarefa: `env.NEXT_PUBLIC_DOCS_URL` em `apps/web/app/[locale]/components/footer.tsx:28` sofre do mesmo problema e é `undefined` em runtime hoje, então o link de Documentação nunca aparece no rodapé da web. Vale uma tarefa própria.

### D-2. `.env.example` só na `apps/web`

O plano pedia nos dois. A variável é lida apenas pela `apps/web`; publicá-la no `apps/app/.env.example` seria configuração morta.

### D-3. O passo "ler o rótulo do titular" saiu do orquestrador

O plano o listava como passo 1. Nenhum passo posterior usa o rótulo: `anonymizeUserLabels` limpa por id, e o evento `ACCOUNT_DELETE` nasce com `actorLabel: null` e `targetLabel: null` justamente para não reintroduzir o e-mail. Uma leitura que ninguém consome seria código morto.

### D-4. O passo `billing` reporta `billing-not-linked`, não `billing-not-configured`

O bloqueio não é a chave da Stripe. Nenhum perfil guarda referência a cliente de pagamento, então não haveria o que cancelar mesmo com chave configurada, e o motivo reportado precisa dizer isso. A escolha também mantém `@repo/payments` fora do módulo: o pacote tem `import "server-only"`, que quebra a importação sob Vitest e obrigaria o teste de unidade a mockar uma dependência que o código não usa.

### D-5. Os dois métodos de leitura recebem o teto e devolvem `truncated`

O plano assinava `findAllByUserId(userId): Promise<EntityDTO[]>`. Ficou `findAllByUserId(userId, limit): Promise<{ items, truncated }>`, e o mesmo para `findAllByInvolvedUserId`. O corte por `EXPORT_MAX_RECORDS` mora junto da consulta, que é quem sabe ler um a mais que o limite para distinguir página cheia de página cortada.

### D-6. Não existe `isStepDone`

A rota faz a checagem inline (`report.some(step => step.step === "authAccount" && step.status === "done")`). Um helper exportado do `account-erasure.ts` obrigaria o teste de rota a usar `vi.importActual` naquele módulo, que puxa `@repo/auth/server` e o `server-only` junto, quebrando a suíte.

### D-7. Corrigi o `Footer`, não o meu call site

`packages/design-system/components/ui/button.tsx:68-70` aplica `disabled={loading}` **antes** de espalhar `{...props}`, então um `disabled` explícito sobrescreve a trava de carregamento. O `Footer` sempre passa os dois, e o resultado é que `isLoading` mostra o spinner mas não bloqueia o segundo clique. Há 8 call sites de `Footer` com `isLoading` na `apps/app`, todos com o mesmo defeito, e um deles passou a ser a confirmação de uma exclusão irreversível.

Corrigi em `apps/app/shared/components/ui/Footer.tsx:43`, com `disabled || isLoading`. Não toquei no `Button`: `packages/design-system/components/ui/` está fora do Biome e é regenerado por `pnpm bump-ui`, então a correção não sobreviveria.

**Atenção do `/review`:** isso muda o comportamento de 8 formulários, sempre no sentido de bloquear mais. As suítes de `accountSecurityForm`, `accountPreferencesForm` e `entityFormsReadOnly` continuam passando.

### D-8. `privacyPolicyUrl` virou helper compartilhado

`apps/app/app/layout.tsx` montava a URL da política inline. O painel de privacidade precisa da mesma URL, então a construção saiu para `apps/app/shared/lib/privacyPolicyUrl.ts` e o layout passou a chamá-la. Extração literal, sem mudança de comportamento.

## Caminho degradado, e como sei que funciona

| Cenário | Comportamento | Instrumento |
|---|---|---|
| Sem bucket de Storage | `runAccountErasure` devolve `{ step: "storage", status: "skipped", reason: "storage-not-configured" }` e não chama `deleteObjectsByPrefix` | `apps/api/__tests__/accountErasure.test.ts`, caso "pula o expurgo de arquivos e diz por quê quando não há bucket" |
| Sem bucket de Storage, no export | `storageObjects: []`, e a listagem nem é chamada | `apps/api/__tests__/accountExportRoute.test.ts`, caso "degrada a lista de objetos para vazia sem bucket" |
| Sem vínculo com cliente de pagamento | `{ step: "billing", status: "skipped", reason: "billing-not-linked" }` | mesmo arquivo do primeiro caso |
| `NEXT_PUBLIC_PRIVACY_CONTACT=""` | O canal cai em `/{locale}/contact`, não em `mailto:` vazio | `apps/web/__tests__/privacyContact.test.ts`, caso "trata string vazia como ausência" |
| Sem `NEXT_PUBLIC_WEB_URL` | A aba omite o link da política em vez de apontar para `undefined/...` | `apps/app/__tests__/accountPrivacyPanel.test.tsx`, caso "omite o link em vez de apontar para lugar nenhum" |
| Sem `ARCJET_KEY` | O limitador é no-op. Só verifiquei que os dois caminhos entram na lista | `apps/api/__tests__/corsOrigin.test.ts`, caso "counts the data rights endpoints" |
| Um passo do expurgo falha | Os seguintes continuam, e a resposta só vira 500 se o passo `authAccount` não concluir | `accountErasure.test.ts` ("segue apagando depois de um passo que falhou") e `accountDeletionRoute.test.ts` ("reporta falha quando a conta de Auth sobreviveu") |

Nenhum índice composto novo. `firestore.indexes.json` não foi tocado, `apps/api/__tests__/firestoreIndexes.test.ts` passa sem alteração, e o caso "never orders the erasure query" em `baseRepository.test.ts` prova que a consulta do expurgo não emite `orderBy`.

## Validação

Comandos e resultados, todos rodados em `/Users/guilhermebittelbrunn/conductor/workspaces/next-boilerplate/kathmandu-v1`:

| Comando | Resultado |
|---|---|
| `pnpm turbo run lint typecheck test` | 24 de 24 tasks com sucesso |
| `pnpm check` | 645 arquivos verificados, 0 erros |
| `pnpm --filter api test` | 57 arquivos, 645 testes |
| `pnpm --filter app test` | 62 arquivos, 450 testes |
| `pnpm --filter web test` | 6 arquivos, 35 testes |
| `pnpm --filter @repo/internationalization test` | 5 arquivos, 44 testes (inclui o de paridade) |
| `pnpm --filter api build` | Passou. A tabela de rotas lista `/account/deletion` e `/account/export` como `ƒ` |
| `pnpm --filter web build` | Passou |
| `pnpm --filter app build` | Passou |

Nenhum processo foi deixado rodando: os builds não ocupam porta e não subi servidor nenhum.

Arquivos de teste novos: `accountErasure.test.ts`, `accountExportRoute.test.ts`, `accountDeletionRoute.test.ts`, `auditTrailAnonymization.test.ts` (api); `downloadJsonFile.test.ts`, `accountDeletionSchema.test.ts`, `accountPrivacyPanel.test.tsx`, `useAccountDataRights.test.tsx` (app); `privacyContact.test.ts` (web); `legalSections.test.ts` (i18n). Arquivos estendidos: `baseRepository.test.ts`, `corsOrigin.test.ts`, `accountApiErrorCopy.test.ts`.

O `legalSections.test.ts` fecha o buraco que o plano apontou: `parity.test.ts:16` trata array como folha, então uma seção legal presente em um idioma só não seria pega. O teste novo compara a contagem de seções entre os 3 idiomas e cobra cada nome de cookie em cada idioma.

## A verificar no `/test`

Cada item abaixo é comportamento que **não medi**. Não escrevi nenhum como validado.

1. **Download real no navegador.** O `downloadJsonFile` é provado em jsdom com `HTMLAnchorElement.prototype.click` mockado; nenhum arquivo foi gravado em disco. Repro: `/pt-br/account?tab=privacy`, clicar em "Baixar meus dados", abrir o JSON e conferir `account.lastAccessAt` presente, `account.avatarUrl` ausente, e o bloco `cookieConsent` com a decisão daquele navegador.
2. **Expurgo contra Firestore de verdade.** Todo o expurgo é provado contra um Firestore falso em memória. `purgeAll`, `anonymizeUserLabels` e `deleteUser` nunca rodaram contra o emulador nem contra projeto real. Repro: emulador + seed, criar 2 entidades (apagar uma, para ter soft delete), trocar a senha uma vez (gera evento de trilha), excluir a conta com a senha certa e então **recadastrar com o mesmo e-mail**. Recadastrar é o que distingue esta entrega do soft delete de hoje.
3. **Trilha depois da exclusão.** O admin abre `/admin/audit` e confere que o evento `account.delete` e os eventos anteriores daquele usuário aparecem sem e-mail, e que um evento em que o admin agiu sobre ele mantém o e-mail do admin.
4. **Export sob impersonação, ponta a ponta.** Provado por unidade, nunca contra o servidor. Repro com a API de pé: `curl -i -H 'Cookie: access-token=<sessão de admin>' -H 'x-user-id: <uid admin>' -H 'x-user-role: admin' -H 'x-request-role: common' -H 'x-request-user-id: <uid comum>' http://localhost:3002/account/export`, esperando 403 com `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN`.
5. **Conta só com Google.** O estado é provado com `providerData` sintético; nunca autentiquei com Google. Repro: entrar com Google, abrir a aba, e conferir que o bloco mostra o texto do canal de privacidade em vez do formulário.
6. **Aparência.** Não olhei nenhuma tela. Falta percorrer a aba nova e a página legal em light, dark e mobile, nos 3 idiomas. A seção de cookies é longa e pode estourar a largura da coluna da página legal.
7. **Duplo clique.** A correção do `Footer` é provada por leitura do código, não por clique. Repro: com a rede em throttle, clicar duas vezes em "Excluir para sempre" e em "Baixar meus dados" e conferir que só uma requisição sai.
8. **Rate limit efetivo.** Sem `ARCJET_KEY` o limitador é no-op, então nem o `/test` consegue medir. O que dá para verificar é que os caminhos estão na lista.
9. **Deep link `/account?tab=privacy`.** A tupla `accountTabValues` ganhou `"privacy"` e o `resolveTab` resolve, mas não exercitei o link vindo da página legal.

## Lacunas de teste conhecidas

- `listObjectPaths` e `deleteObjectsByPrefix` (`apps/api/(shared)/lib/storage.ts`) não têm teste: dependem do SDK do bucket, e não existe bucket.
- O caminho de exceção de `readStorageObjects` (`account-export.ts`), em que a listagem falha e o export degrada para `[]`, não é exercitado.
- `PurgeNotFinishedError`, o teto de 100 passagens do `purgeAll`, não tem teste.
- O `AccountTabs` não tem teste de deep link por `?tab=`.

## Decisões em aberto

1. **`EXPORT_MAX_RECORDS = 5000` é arbitrário.** Nenhum fork tem volume medido para justificar o número. Acima dele o dossiê traz `truncated: true` no bloco correspondente, mas não há segunda página: quem bater no teto perde o resto.
2. **A aba não existe no modo `simple`.** Nesse modo o painel comum é inalcançável pelo usuário, então o autoatendimento some e sobra o canal publicado na `apps/web`. Nenhum arquivo desta entrega lê `NEXT_PUBLIC_PRODUCT_MODE`; é consequência de produto, não de código.
3. **"Excluir" passa a significar duas coisas.** O `DELETE /users/[id]` do admin continua sendo soft delete, e o titular passa a fazer expurgo. A decisão D8 do plano manteve assim. A alternativa barata que ficou registrada é renomear a ação do admin para "desativar", o que resolveria a ambiguidade de vocabulário sem tocar em comportamento.
4. **O defeito de `env` na `apps/web` (desvio D-1) afeta `NEXT_PUBLIC_DOCS_URL` hoje.** Deixei como está. Corrigir pede decidir entre declarar cada chave do core no `env.ts` da web ou tirar o `skipValidation`.
