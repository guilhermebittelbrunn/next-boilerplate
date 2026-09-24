# Revisão — Direitos do titular: exportar dados e excluir conta

| | |
|---|---|
| Handoff | [`../develop/handoff.md`](../develop/handoff.md) |
| Data | 2026-09-23 |
| Escopo | 66 entradas no working tree, 4 assuntos distintos |
| Commits | nenhum. A revisão propõe o plano; quem commita é o `/review` com o "sim" do usuário |
| Rodadas | 2. A segunda responde ao `D1`/`D2` que o `/test` devolveu |

## Branch

`feat/data-rights-lgpd`, **renomeada** a partir de `kathmandu-v1`, que é o nome de placeholder do
Conductor.

A renomeação foi segura: `git rev-parse --abbrev-ref @{u}` respondeu `no upstream configured` e
`git log --oneline origin/main..HEAD` saiu vazio, então não havia remoto nem commit de terceiro em cima.
Usei `git branch -m feat/data-rights-lgpd`.

O nome passou no regex do `/review`:

```
branch OK: feat/data-rights-lgpd
```

Sem prefixo de projeto porque o diff cruza `packages/sdk`, `packages/next-config`, `apps/api`, `apps/app`,
`apps/web` e `packages/internationalization`. A regra de `.claude/rules/git-commits.md` manda omitir o
`project` quando a mudança atinge vários apps.

## Achados

Nenhum bloqueante.

| Sev | Arquivo:linha | Problema | Ação |
|---|---|---|---|
| 🟡 | `apps/app/.../account/(components)/AccountTabs.tsx:59-70` | **Regressão desta entrega**, achada pelo `/test`. A quinta aba levou a faixa a 429 px e a página inteira a rolar na horizontal em 375 px (`scrollWidth` 445 contra `innerWidth` 375). `TabsList` é `inline-flex w-fit` (`packages/design-system/components/ui/tabs.tsx:28`): cresce além da tela em vez de rolar | **Corrigido** no call site |
| 🟡 | `apps/app/.../account/(components)/AccountTabs.tsx:30-33,44-46` | Navegar de `?tab=profile` para `?tab=privacy` pela barra lateral troca a URL e não troca a aba. `activeTab` é `useState(() => …)` e navegação suave na mesma rota não remonta o componente. Pré-existente: `billing` e `security` já faziam isso | Não corrigido, **de propósito**. Ver o veredito abaixo |
| 🟡 | `apps/app/.../account/(components)/AccountPrivacyPanel.tsx:92` | O botão de exportar passava `disabled={isImpersonating}` junto de `loading={...isPending}`. É o mesmo defeito que o desvio D-7 corrigiu no `Footer`: `Button` aplica `disabled={loading}` **antes** do `{...props}` (`button.tsx:68-70`), então o `disabled` explícito anula a trava. Fora de personificação o botão ficava clicável durante o request, e dois cliques disparam dois dossiês, dois eventos de trilha e duas passagens pelo rate limit | **Corrigido** |
| 🟡 | `apps/app/shared/components/ui/PageFormFooter.tsx:30,42` | O outro rodapé compartilhado tinha o defeito idêntico (`disabled={submitDisabled}` com `loading={isSubmitting}`). O D-7 corrigiu o `Footer` "na raiz", mas a raiz tem dois galhos | **Corrigido** |
| 🟡 | `apps/api/(shared)/repositories/audit-event.repository.ts` (`anonymizeUserLabels`) | Lia **todos** os eventos do titular sem `limit`, enquanto o export do mesmo dado corta em `EXPORT_MAX_RECORDS`. Na prática o volume é pequeno; no código era ilimitado, e a trilha inteira ia para a memória antes do primeiro lote | **Corrigido**: pagina por cursor e acusa em vez de silenciar |
| 🟡 | `apps/api/app/(routes)/account/deletion/route.ts:48-62` | Sem `FIREBASE_WEB_API_KEY` em produção, `getWebApiKey()` levanta `IdentityToolkitError` com a mensagem de configuração (`firebase-identity-toolkit.ts:47-49`). O `catch` trata como falha de credencial e `mapPasswordCheckMessageToCode` cai no fallback, então o titular lê "senha atual inválida" num servidor mal configurado. Não é 500, mas mente | Não corrigido. É pré-existente e literal em `account/password/route.ts:39-51` |
| 🟡 | `apps/api/app/(routes)/account/deletion/route.ts:19-28` | `runAccountErasure` recebe `profile: ctx.subjectProfile` (sujeito) e `uid: ctx.user.uid` (ator). São a mesma pessoa hoje e eu confirmei por quê, mas a invariante mora duas camadas acima de quem a consome | **Corrigido**: a rota assere o vínculo antes de qualquer coisa irreversível |
| 🟢 | `apps/app/shared/lib/downloadJsonFile.ts:19-27` | A âncora nunca entra no documento e `URL.revokeObjectURL` roda de forma síncrona no `finally`, logo após o `click()`. Funciona em Chromium. Em outro motor é o padrão que costuma falhar | Não corrigido. Virou item do `/test` com repro |
| 🟢 | `packages/internationalization/__tests__/legalSections.test.ts:11-19` | `COOKIE_NAMES` é uma cópia mantida à mão. Um cookie novo no código não derruba o teste, então a política envelhece em silêncio. Conferi os 7 nomes contra o código hoje e todos existem | Não corrigido |
| 🟢 | `packages/internationalization/.../common/account.ts` (`delete.validation.min`, 3 idiomas) | A copy escreve "6 caracteres" enquanto o número vive em `accountDeletionSchema.ts:6`. Mesmo padrão do resto do repo | Não corrigido |
| 🟢 | `apps/api/proxy.ts:53-54` | `/account/deletion` entrou no rate limit pela cota do Identity Toolkit, mas `/account/password` gasta a mesma cota na mesma classe de tentativa e continua livre. O caso novo em `corsOrigin.test.ts` fixa essa lacuna como comportamento esperado | Não corrigido, pré-existente |

### ✅ Conforme

Os pontos de desenho que esta feature tinha obrigação de acertar, cada um conferido no código:

- **Posse pelo sujeito da sessão.** `deleteAccountSchema` é `.strict()` e só aceita `currentPassword`
  (`account.schema.ts:55-66`), o sujeito sai de `ctx.subjectProfile`, e um perfil `COMMON` não consegue
  apontar `requestUserId` para outra pessoa: `validateCommonProfile` recusa com
  `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` (`auth-request-context.ts:50-52`). As duas rotas usam
  `requireCommonPanelApi`, nenhuma usa `requireAdminApi`.
- **Exclusão sob personificação.** O `POST` é recusado pelo guard antes de chegar ao handler, porque
  `assertReadOnlyWhileImpersonating` só libera `GET`, `HEAD` e `OPTIONS`
  (`impersonation-read-only.ts:5,23-30`). Isso é o que impede o cenário grave: se passasse, o handler
  combinaria o perfil do sujeito com o `uid` do admin. O caso
  "recusa a exclusão durante uma personificação, antes de ler o corpo" fixa a recusa.
- **Export recusa sob personificação.** Aqui o guard não resolve, já que `GET` é método seguro, e a rota
  faz a checagem própria (`export/route.ts:12-17`).
- **Reautenticação por senha.** `deletion/route.ts:48-62` refaz o sign-in em vez de confiar no frescor da
  sessão, e o comentário em `:45-47` registra o motivo de forma autocontida, sem citar artefato do fluxo.
- **Nada de terceiro no dossiê.** `toExportRecord` guarda `action`, `actorRole`, `createdAt` e `requestId`,
  e descarta os rótulos (`account-export.ts:66-76`). `avatarUrl` fica de fora
  (`account-export.ts:28,40-44`). O `account` vem de `serializeUserRecord`, que é whitelist de campos
  (`user.mapper.ts:4-28`), então nada de `passwordHash` escapa junto.
- **Trilha retida, não apagada.** `anonymizeUserLabels` limpa o rótulo por papel e preserva o do operador
  (`audit-event.repository.ts:126-131`), e o evento `ACCOUNT_DELETE` nasce depois da varredura com os dois
  rótulos nulos (`deletion/route.ts:81-92`).
- **`purge` e `purgeAll`.** A consulta do expurgo é de igualdade e escopada no dono
  (`entity.repository.ts:62-66`), sem `orderBy`, então não pede índice composto. Lotes de 500 com teto de
  100 passagens e `PurgeNotFinishedError` no fim (`base.repository.ts:243-261`). Não achei caminho que
  alcance documento de outro dono: `purgeProfile` recebe o id do próprio perfil e os dois métodos são
  `protected` na base.
- **Caminho degradado sem 500.** Sem bucket, o passo responde `skipped: storage-not-configured`; a
  cobrança responde `skipped: billing-not-linked`; um passo que falha não interrompe os seguintes e só
  `authAccount` transforma a resposta em `ACCOUNT_DELETION_FAILED`. `reasonOf` grava o nome do erro e
  nunca a mensagem (`account-erasure.ts:32-36`), que é onde o Firestore devolveria caminho de documento.
- **Comentários.** Varri as linhas adicionadas em `apps/**` e `packages/**` atrás de `plan.md`,
  `handoff.md`, `docs/features/`, `STATE.md`, ID de card e narração de etapa. Zero ocorrência. Nenhum
  `console.log` novo.
- **Corte da spec.** Os 5 itens de `specs/data-rights-lgpd.md:104-127` estão cobertos, com o item 3
  entregue recortado (arquivos e assinatura viram passos declarados que reportam `skipped`), exatamente
  como o `STATE.md` registrou antes de começar. O `lastAccessAt` herdado de `user-activity-tracking` sai no
  export junto do documento de perfil e é apagado pelo `purgeProfile`.
- **Segredo nos artefatos.** Varri `docs/features/data-rights-lgpd/` atrás de senha, token, chave e e-mail
  de pessoa real. Nada. O que aparece são nomes de símbolo e de variável de ambiente.

## Correções aplicadas

Quatro, todas no working tree para o usuário conferir no `git diff` antes de qualquer commit. Cada uma
veio com o teste que prova o comportamento, e em três delas eu reverti a correção para ver o teste falhar
antes de restaurá-la.

### 1. Botão de exportar aceitava duplo clique

`apps/app/.../account/(components)/AccountPrivacyPanel.tsx:92`

```diff
-                    disabled={isImpersonating}
+                    disabled={isImpersonating || exportDataMutation.isPending}
```

O `Button` do design system aplica `disabled={loading}` e só depois espalha `{...props}`
(`packages/design-system/components/ui/button.tsx:68-70`), então qualquer `disabled` explícito vence a
trava de carregamento. Sem a correção o spinner aparecia e o clique continuava valendo.

### 2. O segundo rodapé compartilhado tinha o mesmo defeito

`apps/app/shared/components/ui/PageFormFooter.tsx:30,42`, com a linha que o D-7 já tinha aplicado no
`Footer`:

```diff
+    const isBlocked = submitDisabled || isSubmitting;
...
-            <Button
-                disabled={submitDisabled}
-                loading={isSubmitting}
-                type="submit"
-            >
+            <Button disabled={isBlocked} loading={isSubmitting} type="submit">
```

Dos três call sites em que `disabled` e `loading` divergem, dois já estavam corrigidos. Deixar o terceiro
era a metade de conserto que faz a classe de defeito parecer resolvida.

Teste novo: `apps/app/__tests__/sharedFooterPendingState.test.tsx`, 5 casos cobrindo os **dois** rodapés.
O `Footer` não tinha teste nenhum até aqui, então o D-7 passa a ter prova além da leitura. Com as duas
correções revertidas, falham exatamente os 2 casos de "bloqueia o envio enquanto carrega" e passam os 3 de
controle, incluindo o que garante que o `disabled` explícito continua valendo sem carregamento.

### 3. A rota de exclusão assere o vínculo entre sujeito e ator

`apps/api/app/(routes)/account/deletion/route.ts:19-28`

```ts
if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
    return Response.json(
        { error: { code: "AUTH_REQUEST_IMPERSONATION_FORBIDDEN" } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}
```

O expurgo destrói os registros do sujeito e assina com a conta Firebase do ator. Hoje são sempre a mesma
pessoa, e a checagem é inalcançável por dois caminhos independentes (`auth-request-context.ts:50-52` e
`impersonation-read-only.ts:23-30`). É código que não executa, e esse é o preço certo num caminho que
apaga conta: se a invariante se mover, a rota recusa em vez de apagar a pessoa errada.

Reusei `AUTH_REQUEST_IMPERSONATION_FORBIDDEN`, que já existe nos 3 idiomas ("Não é possível atuar como
outro usuário."), então não entrou código de erro novo.

Teste novo em `accountDeletionRoute.test.ts`: "recusa quando o perfil em contexto não é o dono da sessão".
Com a asserção removida, a rota responde **200** e segue para o expurgo, que é exatamente o estrago que
ela existe para impedir.

### 4. A anonimização da trilha pagina por cursor e acusa quando não drena

`apps/api/(shared)/repositories/audit-event.repository.ts`

A varredura lia a trilha inteira com um `.get()` sem `limit` e montava a lista de patches em memória.
Agora ela segue a forma do `purgeAll`: lotes de 500, teto de 100 passagens, e
`AuditTrailNotAnonymizedError` quando o teto estoura. O `runStep` do orquestrador transforma isso em
`{ step: "auditTrail", status: "failed" }`, então uma anonimização pela metade é reportada em voz alta em
vez de contar como feita.

Uma diferença em relação ao `purgeAll` que vale registrar: apagar encolhe o resultado da consulta, mas
anonimizar não. O evento continua casando com `array-contains involvedUserIds` depois de perder o rótulo,
então reexecutar a mesma consulta devolveria a mesma página para sempre. A saída é cursor, e o único
`orderBy` que uma consulta de filtro único ganha de graça é `FieldPath.documentId()`, porque todo índice
já termina nele. Nenhum índice composto novo, e `firestore.indexes.json` continua intocado.

O predicado de qual rótulo cai saiu para a função `labelPatchFor`, fora da classe. A regra não mudou: o
rótulo do operador que agiu sobre a conta é preservado.

Três casos novos em `auditTrailAnonymization.test.ts`, e o fake de Firestore do arquivo ganhou ordenação e
cursor. O fake **recusa** qualquer ordenação que não seja `__name__`, para que uma consulta que passasse a
exigir índice composto não entre sem ninguém ver.

## Rodada 2 — o que o `/test` devolveu

### D1. A faixa de abas alargava a página em 375 px. Corrigido.

O `/test` mediu `document.documentElement.scrollWidth` em 445 contra `innerWidth` de 375, com a faixa de
abas em 429 px: 5 abas de 85 px mais os vãos. Com 4 abas dava 344 e cabia, então a aba nova é o gatilho e
a entrega é a dona do defeito.

**Onde corrigir.** A causa está em `packages/design-system/components/ui/tabs.tsx:28`, onde `TabsList` é
`inline-flex w-fit` sem wrap nem scroll. Não corrigi lá. O `pnpm bump-ui` deste repo é
`npx shadcn@latest add --all --overwrite -c packages/design-system` (`package.json:22`): o `--overwrite` é
literal e o arquivo volta ao original na próxima sincronização. É a mesma razão pela qual o desvio D-7
corrigiu o `Footer` em vez do `Button`. Os dois únicos call sites de `TabsList` no repositório são as abas
da conta e o `playground`, então o call site cobre a superfície inteira do defeito relatado.

**O que tentei e descartei antes de escrever a correção.** A saída mais óbvia seria deixar a faixa quebrar
linha, com `h-auto flex-wrap` na `TabsList`. Ela não funciona, e o motivo é mensurável:

```
twMerge(base, 'h-auto flex-wrap')
→ ... group-data-[orientation=horizontal]/tabs:h-9 ... h-auto flex-wrap
```

O `h-9` sobrevive porque está atrás de um modificador e o `tailwind-merge` não o trata como conflito de
`h-auto`. Como `Tabs` sempre emite `data-orientation="horizontal"`, a altura continua travada em 36 px e a
segunda linha de abas seria cortada. Uma correção que esconde metade das abas é pior que o defeito.

**O que ficou.** Um contêiner de rolagem em volta da faixa, em `AccountTabs.tsx`:

```tsx
<div className="w-full overflow-x-auto overflow-y-hidden">
    <TabsList>…</TabsList>
</div>
```

Envolver em vez de reescrever a `TabsList` mantém `w-fit` e `h-9` intactos, então a correção não disputa
nenhuma classe da variante e a barra de rolagem, onde a plataforma desenhar uma, fica fora da faixa de
36 px em vez de espremer os gatilhos. O `overflow-y-hidden` é explícito porque declarar rolagem num eixo
transforma o elemento em contêiner de rolagem nos dois, e o pseudo-elemento `after:` dos gatilhos fica 5 px
abaixo deles. Na variante `default`, que é a usada aqui, esse pseudo-elemento tem `opacity-0`.

O que a correção compra, e é o ponto: a largura da página deixa de depender do comprimento do rótulo
traduzido. Era essa dependência que fazia o defeito existir em português e talvez não em inglês.

**Medição.** Não mede pixel: eu não subo browser e o jsdom não faz layout. O teste novo
(`apps/app/__tests__/accountTabsOverflow.test.tsx`, 2 casos) prova a contenção, que é a parte que o código
controla: a faixa está dentro de um elemento com `overflow-x-auto` e `w-full`, e são 5 abas. Removido o
contêiner, o primeiro caso falha com `expected 'group/tabs flex gap-2 …' to contain 'overflow-x-auto'`,
porque o pai volta a ser a raiz do `Tabs`.

**A medição de tela fica para a rodada 2 do `/test`**, nos 3 idiomas, do mesmo jeito que a primeira:
`scrollWidth` contra `innerWidth` em 375 px, em `/pt-br`, `/en` e `/es`.

### D2. O deep link pela barra lateral não troca a aba. Fica como achado.

Concordo em não corrigir, e o motivo é mais forte do que "está fora do corte".

A correção ingênua está errada. Sincronizar `activeTab` a partir de `useSearchParams()` num efeito parece
o conserto de duas linhas, mas a troca de aba é feita com `window.history.replaceState`
(`AccountTabs.tsx:51-55`), que **não** avisa o router do Next. O `useSearchParams()` continua devolvendo o
valor antigo depois de um clique na própria faixa, e o efeito de sincronização puxaria a aba de volta.
Trocaria um deep link quebrado por abas que voltam sozinhas, que é pior.

O conserto correto é derivar a aba da URL e trocar com `router.replace`, abrindo mão do
`history.replaceState`. Isso reverte uma decisão deliberada e comentada em `AccountTabs.tsx:48-50`, tomada
para não pagar ida ao servidor ao trocar de aba, e afeta as 5 abas. É decisão de produto, não conserto de
revisão, ainda mais numa tarefa que já mexeu em dois componentes compartilhados.

Um ajuste na leitura do `/test`, que não muda o veredito: o mecanismo é pré-existente, mas esta entrega
**acrescentou um terceiro item de barra lateral** que o exercita (`routes.tsx:55-58`). O defeito não é
novo, a superfície dele cresceu.

A lacuna de teste "deep link do `AccountTabs`" fica **aberta de propósito**. Escrever o teste agora
fixaria o comportamento defeituoso.

## Auditoria dos 8 desvios

Os seis restantes conferem com o que o código faz. Os dois que o `/review` recebeu com pedido de leitura
cética:

**D-1 procede, e é literal.** `@t3-oss/env-core@0.13.8` resolve `const skip = !!opts.skipValidation;` e
logo em seguida `if (skip) return runtimeEnv;`. O `reduce` sobre `opts.extends` e o `Object.assign` com
`parsed.value` vêm depois, no caminho validado, então com `skipValidation: true` o `extends` nunca é
mesclado. Conferido em
`node_modules/.pnpm/@t3-oss+env-core@0.13.8_arktype@2.1.20_typescript@5.9.3_zod@4.1.12/node_modules/@t3-oss/env-core/dist/src-Bb3GbGAa.js`.

A consequência que o handoff apontou também procede: `apps/web/env.ts:29` usa `skipValidation: true`, e
`NEXT_PUBLIC_DOCS_URL` só existe no `core()`, então `env.NEXT_PUBLIC_DOCS_URL` em
`apps/web/app/[locale]/components/footer.tsx:28` é `undefined` hoje e o link de Documentação não aparece no
rodapé da web. É defeito pré-existente que a entrega expôs, e deixar fora desta tarefa foi a decisão certa.

O alcance para aqui. `apps/app/env.ts` **não** tem `skipValidation`, então ali o `extends` é mesclado e o
`privacyPolicyUrl` lê `NEXT_PUBLIC_WEB_URL` normalmente. O fallback que omite o link é fallback de
verdade, não o comportamento permanente.

**D-7 procede, e o alcance era maior do que o desvio descreveu.** A ordem das props é a que o handoff
afirmou: `disabled={loading}` está antes de `{...props}` no JSX do `Button`
(`packages/design-system/components/ui/button.tsx:68-70`). Varri os call sites de `Button` que passam
`disabled` e `loading` ao mesmo tempo. A maioria escapa por coincidência, porque passa o mesmo valor nas
duas props. Os que divergem são três: o `Footer` (corrigido pelo D-7), o `PageFormFooter` (intocado, ver
achados) e o botão de exportar (corrigido por mim). Mexer no `Footer` em vez do call site foi a escolha
certa, e a justificativa de não tocar no `Button` também: `packages/design-system/components/ui/` está
fora do Biome e é regenerado por `pnpm bump-ui`.

## Raio de impacto

| Símbolo | Consumidores | Risco |
|---|---|---|
| `AccountDataExportDTO`, `AccountDataExportRecord`, `DeleteAccountRequest` | `apps/api`, `apps/app` | Tipos novos. Nenhuma assinatura existente mudou |
| `AuditAction.ACCOUNT_DATA_EXPORT`, `AuditAction.ACCOUNT_DELETE` | `apps/api` grava, `apps/app` rotula na trilha do admin | Acréscimo ao enum. O mapa de rótulos ganhou as duas chaves nos 3 idiomas |
| `BaseRepository.purge`, `BaseRepository.purgeAll` | Herdados por **todo** repositório do monorepo | Os dois são `protected`, então nenhum repositório passa a destruir sem escrever um método próprio. Mesmo assim é capacidade nova em classe base: um recurso futuro que guarde dado do titular precisa entrar no `runAccountErasure` e no `buildAccountDataExport`, ou os dois passam a mentir sobre a cobertura |
| `Footer` (`disabled \|\| isLoading`) | 8 formulários da `apps/app` | Sempre no sentido de bloquear mais. O usuário deve olhar o `git diff` deste arquivo com atenção: é o único ponto da entrega que muda comportamento fora do escopo da feature |
| `LegalDocument` (prop `contact` opcional) | `apps/web` privacy e terms | Opcional, então a página de termos não muda |
| `ownerPrefix` (`storage.ts:47-48`) | `isOwnedBy`, export e expurgo | Extração literal. A barra no fim é o que impede `uploads/abc/` de capturar `uploads/abcd/` |

## Verificar no `/test`

Os 9 itens herdados do handoff, com o veredito que dei por leitura e o que o `/test` mediu depois. Deixo os
dois lados porque a diferença entre eles é o registro de quanto a leitura alcança.

| # | Item | Veredito da revisão | Resultado medido pelo `/test` |
|---|---|---|---|
| 1 | Download real no browser | Aberto, com risco de âncora solta e revoke síncrono | **Fechado no Chromium**: arquivo em disco, 2971 bytes, JSON válido, `avatarUrl` ausente, zero ocorrência de e-mail de admin. Segundo motor segue 🔒 |
| 2 | Expurgo contra Firestore | Aberto, o de maior risco | **Fechado no emulador**: conta de Auth, perfil e entidades do dono somem, inclusive a soft-deletada; 6 de outros donos intactas; **recadastro com o mesmo e-mail passa** |
| 3 | Trilha depois da exclusão | Parcialmente fechado por leitura | **Fechado**: `/admin/audit` renderiza travessão para rótulo nulo |
| 4 | 403 sob personificação no export | Fechado por leitura | Confirmado |
| 5 | Conta só com Google | Aberto | **Fechado** com provedor real: o painel troca o bloco e mostra zero botão de excluir |
| 6 | Light, dark e mobile nos 3 idiomas | Aberto, com suspeita sobre a seção de cookies e o diálogo | **Uma falha real e duas suspeitas minhas derrubadas.** A seção de cookies quebra linha dentro do `max-w-2xl` (360 px) e o `AlertDialog` mede 343 px em 375: as duas cabem. O que não cabia era a faixa de abas, que eu não tinha previsto. Ver D1 |
| 7 | Duplo clique | Aberto, escopo maior | **Fechado nos dois botões**: um `GET /account/export` e um `POST /account/deletion` |
| 8 | Rate limit efetivo | Fora de escopo sem `ARCJET_KEY` | Sem mudança |
| 9 | Deep link `/account?tab=privacy` | Aberto, com repro afinado | **Confirmado defeituoso** pelo repro que a leitura previu. Ver D2 |

O item 6 é o que vale registrar: das três coisas que a revisão mandou olhar na tela, as duas que eu apontei
não procediam e a que quebrou eu não tinha visto. Contar abas não é algo que se faça lendo diff.

Aberto para a rodada 2, só isto:

- **D1 em 3 idiomas**: `scrollWidth` contra `innerWidth` em 375 px, em `/pt-br/account?tab=privacy`,
  `/en/...` e `/es/...`, confirmando que a faixa rola dentro de si e a página não.
- **Download num segundo motor**, se houver algum além de Chromium à mão. O `agent-browser` é CDP, então
  pode ficar 🔒 para sempre, e isso é uma resposta aceitável.

## Lacunas de teste

| Lacuna | Estado |
|---|---|
| `listObjectPaths` e `deleteObjectsByPrefix` | **Continua aberta.** Depende de bucket e não existe bucket |
| Exceção de `readStorageObjects` | **Fechada pelo `/test`**, em `accountExportRoute.test.ts` |
| `PurgeNotFinishedError` e o teto de 100 passagens | **Fechada pelo `/test`**, em `baseRepository.test.ts` |
| Deep link do `AccountTabs` por `?tab=` | **Aberta de propósito.** O comportamento está defeituoso (D2) e escrever o teste agora fixaria o defeito. Ela reabre junto com a decisão de produto, não antes |

## Decisões em aberto

Sobrou uma.

1. **`EXPORT_MAX_RECORDS = 5000` continua arbitrário**, como o handoff registrou. Nenhum fork tem volume
   medido para justificar o número. Quem bater no teto perde o resto, e `truncated: true` avisa sem
   oferecer segunda página. Vai para o usuário no relatório final.

Fechadas no caminho:

- O `PageFormFooter`, a asserção de sujeito e ator e a paginação da anonimização foram decididos pelo
  `/cycle` e implementados na rodada 1.
- **`revokeObjectURL` síncrono: fica como está.** O `/test` mediu e o download não truncou. Mudar o código
  e uma asserção escrita de propósito por causa de uma hipótese que a medição não sustenta não se paga.
  Isso é decisão tomada, não pendência.
- **Deep link das abas: fica como achado** (D2), com o registro de por que a correção ingênua está errada.

Seguem em aberto, sem mudança de estado, as que o handoff já tinha registrado: a aba não existe no modo
`simple`, "excluir" passou a significar duas coisas, e o defeito de `env` da `apps/web` afeta
`NEXT_PUBLIC_DOCS_URL` hoje.

## Gates

Medidos por mim depois da correção do D1:

| Comando | Resultado |
|---|---|
| `pnpm check` | 647 arquivos, 0 erros |
| `pnpm turbo run typecheck --filter=app` | 1 de 1 task, sem cache |
| `pnpm --filter app test` | 64 arquivos, 457 testes |

O `pnpm check` reprovou na primeira tentativa, com `lint/style/noMagicNumbers` no `5` do teste novo. O
número virou `ACCOUNT_TAB_COUNT`.

Citados sem remedir, porque a correção do D1 não entra nesses escopos: `api` com 57 arquivos e 651 testes,
`web` com 6 e 35, `@repo/internationalization` com 5 e 44, e `pnpm test` da raiz em 10 de 10 tasks.

A contagem de arquivos do Biome subiu de 646 para 647, e a da `app` de 455 para 457 testes, por causa do
arquivo novo de teste das abas.

Não subi app, não dirigi browser e não tirei print em nenhuma das duas rodadas.

### Segredo nos artefatos do `/test`

Varri `docs/features/data-rights-lgpd/test/` antes de incluir os dois arquivos no plano de commits, porque
essa é a pasta em que o vazamento já aconteceu duas vezes neste repositório e o QA cria conta com senha.

Está limpo. Os cinco endereços que aparecem são `@example.com`, que é domínio reservado e não é pessoa. Não
há literal de senha, token ou chave. O `report.md:367-368` afirma que as senhas não estão em arquivo nenhum,
e dessa vez a afirmação confere com a varredura, diferente dos dois casos anteriores em que o mesmo arquivo
gravava a senha ao lado da frase.

## Plano de commits

Proposto, não executado. A lista completa, com os arquivos de cada bloco, está no retorno ao `/review`.

Ordem: `packages/sdk`, `packages/next-config`, `apps/api` em 4 blocos, `apps/app` em 5 blocos, `apps/web`,
`packages/internationalization`, documentação, auditoria do backlog e por último os artefatos da feature.
São 17 commits, contra os 9 que o `/develop` previu. A diferença está em separar o conserto dos rodapés
compartilhados do resto da `apps/app` e em não misturar a auditoria do backlog com a entrega.

Nem as correções da revisão nem a do D1 criaram commit novo. A contenção da faixa de abas entra no mesmo
commit que introduz a quinta aba, `feat(app): privacy tab in the account area`, junto do teste novo: se
fosse commit separado, haveria um ponto do histórico em que a página rola na horizontal, e não há motivo
para deixar esse ponto existir. Os artefatos do `/test` entram no último commit, com os demais.

⚠️ **O índice não está limpo.** `git diff --cached --stat` devolve hoje o rename
`specs/admin-analytics-dashboard.md` para `docs/features/admin-analytics-dashboard/spec.md`, preparado pelo
`git mv` da auditoria. Ele pertence ao commit da auditoria, não ao primeiro do plano. Este repositório já
perdeu um commit assim: um `git mv` esquecido no índice entrou no commit do contrato do SDK.

### Commits realizados

Preenchido pelo `/review` depois de cada bloco aprovado.
