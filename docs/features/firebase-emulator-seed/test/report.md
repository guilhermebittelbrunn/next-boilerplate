# Relatório de QA — `firebase-emulator-seed`

> Gravado pelo orquestrador do `/cycle`: o subagente de QA produziu o conteúdo mas foi impedido de
> escrever o arquivo pelo harness. Os critérios item a item estão em
> [`criterios-aceite.md`](criterios-aceite.md).

## Placar

| | |
|---|---|
| ✅ Aprovados | **34** |
| ❌ Reprovados | **0** |
| 🔒 Não verificados | **5** |

Nenhum defeito de produção. Não houve rodada de volta ao `/review`.

### Os 🔒, com o motivo

| # | Critério | Por que ninguém consegue verificar |
|---|----------|-------------------------------------|
| A4 | Primeira execução em máquina limpa / offline | Os JARs já estavam em cache. Provar "falha sem rede na primeira vez, funciona offline depois" exige um clone novo com a rede desligada — a máquina limpa não é fabricável aqui. |
| F5 | Login degradado **bem-sucedido** | Exigiria senha de conta no projeto Firebase real, e criar uma polui exatamente o projeto que esta feature existe para proteger. Verificado o que dá: rota de rede, chave, CSP e tratamento de erro voltam ao estado anterior, com **400** e não 500. |
| C3b | `create-dev-admin --allow-real-project` escrevendo de fato | A trava recusa corretamente; o caminho **depois** da flag nunca foi percorrido, de propósito — o script redefine senha de conta existente, irreversível num projeto real. |
| H5 | Login com Google contra o emulador | O `frameSrc` foi medido como necessário, mas o round-trip do popup não fecha sob CDP (artefato de `window.opener`). O mesmo instrumento produziria o mesmo artefato. |
| I5 | `pnpm --filter api build` sob o emulador | `apps/api/env.ts` exige os três `FIREBASE_ADMIN_*` e `skipValidation` só vale em `development`. Decidido no plano (§21-F) como fora do corte — não é regressão desta entrega. |

## Gates medidos

Medidos, não copiados. Três execuções completas do gate, sem cache.

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | ✅ **517 arquivos, 0 erro** |
| `pnpm turbo run lint typecheck test --force` × 3 | ✅ **23/23**, 0 cached — 1m34s / 1m19s / 1m03s |
| `pnpm test` (raiz — gateia o `turbo build`) | ✅ 9/9 workspaces |
| `pnpm install --frozen-lockfile` | ✅ lockfile coerente |

**918 testes em 94 arquivos** (+168 testes / +20 arquivos sobre a medição da auditoria):
`api` 346 · `app` 265 · `@repo/email` 137 · `@repo/auth` 62 · `@repo/security` 31 · i18n 27 · `web` 27 ·
`@repo/shared` 15 · `@repo/payments` 8.

### O flake do `testTimeout` sumiu

Três gates completos sem cache, todos verdes. `accountSecurityForm.test.tsx` levou **2927 ms** para os 7
testes sob a contenção real da suíte — com o teto default de 5000 ms isso já estava a 59% do limite para o
**arquivo inteiro**, e o pior teste isolado sob contenção foi medido em **7401 ms** nesta rodada. Os 20 s
dão ~7× de folga. Nenhuma asserção afastada, nenhum `.skip`.

## Testes criados — 26 em 3 arquivos

### 🔴 `apps/api/__tests__/storageEmulatorIsolation.test.ts` — 13 testes

Fecha a lacuna que o `/review` deixou aberta ao corrigir o vazamento. Cobre a matriz de
`isStorageConfigured()` (bucket × cada host isolado × ambos × string vazia × sem bucket), **a consequência e
não só o predicado** (`POST /files` sob emulação ⇒ 503 `STORAGE_NOT_CONFIGURED`, com `bucket()` e `save()`
nunca chamados), o caminho de leitura (`withPhotoUrl` ⇒ `photoUrl: null`, zero `getSignedUrl`) e o modo real
intacto.

**O teste foi validado contra a regressão que protege.** Revertendo `storage.ts` ao estado pré-correção
(`Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated()` → `Boolean(env.FIREBASE_STORAGE_BUCKET)`),
**7 de 13 falham** — incluindo o teste de rota, que então observa `save()` sendo chamado, ou seja, o objeto
entrando no bucket real. Com a correção reposta: 13/13. Um teste que não falha contra o bug não é teste.

### `packages/auth/__tests__/serverEmulatorInit.test.ts` — 7 testes

Ramo `isEmulated()` de `getFirebaseAdminApp`, sem cobertura até agora: `initializeApp({ projectId })` com
`cert()` **nunca** chamado; preserva o `FIREBASE_ADMIN_PROJECT_ID` configurado; reaproveita app já
registrado; host vazio volta a exigir service account; caminho real com `cert()` intacto.

### `packages/auth/__tests__/clientEmulator.test.ts` — 6 testes

`connectAuthEmulator` no navegador: emular é config completa por si só (não cai no app de fachada, que
assinaria sob o projeto "mock"); config real + emulador mantém o project id real; a var de servidor também é
lida; conecta **uma vez** em duas chamadas; host ausente/vazio nunca redireciona.

## Validação executável

13 screenshots em [`e2e/`](e2e/) (gitignored) cobrindo light + dark + 390×844, `app` e `web`, modo emulado e
estado misto: login emulado, dashboard, entities semeadas, posse 404, formulário com e sem upload, upload
recusado, admin, SSO cross-app na `web`, e os dois cenários de env misto.

Destaques do que foi exercitado ao vivo, não simulado:

- **Isolamento** — `lsof` durante o fluxo: a `api` abriu **só** `127.0.0.1:8080`; a `web`, **só**
  `127.0.0.1:9099` e `localhost:3001`.
- **Idempotência do seed** — 3 execuções devolvem o mesmo estado, consultado direto nos emuladores; e uma
  conta criada à mão **desapareceu** no seed seguinte, provando que é reset de verdade.
- **Upload recusado com bucket real preenchido no `.env`** — o cenário exato do vazamento corrigido.
- **SSO cross-app sob emulador** — a `web` reconheceu a sessão mintada no `app`.

## Observações não bloqueantes

Nenhuma reprova a entrega. As correções sugeridas são **hipótese, não instrução**.

### O2 🟡 — a UI oferece um upload que a API vai recusar

**Repro:** `.env` com hosts do emulador **e** `FIREBASE_STORAGE_BUCKET` preenchido (o estado real do `.env`
de quem rodou). Abrir `/pt-br/entities/create`. O formulário mostra "Escolher imagem", o usuário seleciona o
arquivo, e só então a API recusa com `STORAGE_NOT_CONFIGURED`.

O servidor decide por `isStorageConfigured()` (que conhece `!isEmulated()`); o cliente decide por
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, que não sabe nada sobre emulador. **A segurança está correta — nada
é escrito no bucket real**, confirmado por `lsof` durante o fluxo. O que falha é a consistência da UI.

Isso torna **imprecisa** uma afirmação do `review.md` §3 ("emulando, o formulário cai no campo de URL da
foto"): só vale quando o bucket **também** está vazio, que é o default do `.env.example`.
Hipótese de correção: espelhar `!isEmulated()` no lado do cliente.

### O1 🟡 — erro cru do SDK do Firebase chega à UI como copy

**Repro:** estado misto (`FIREBASE_AUTH_EMULATOR_HOST` preenchida, `NEXT_PUBLIC_*` vazia), tentar login.
Aparece `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`.

Texto cru do provedor como copy, contra a regra de ouro 3. A causa é
`packages/shared/utils/helpers/formattedError.ts:49`, que cai em `error.message` para um `Error` que não é
`AxiosError`. **Pré-existente e fora do diff** — esta entrega apenas torna o estado alcançável por
configuração. Hipótese: mapear os códigos `auth/*` do client SDK para `apiErrors`.

### O3 🟢 — `turbo dev` morre inteiro quando o Turbopack da `apps/web` entra em pânico

`TurbopackInternalError: inner_of_uppers_lost_follower` após um kill abrupto derruba os quatro apps junto;
resolve com `rm -rf apps/web/.next`. Bug do Turbopack, sem relação com a feature — anotado porque atrapalha
o fluxo `pnpm emulators` + `pnpm dev` que o `SETUP.md` recomenda.

## Higiene

✅ Nenhuma conta em projeto Firebase real. ✅ Nenhuma credencial em arquivo versionado.

| Item | Onde | Ação |
|------|------|------|
| `admin@` / `user@` / `user2@example.com` (`demo1234`) | só emulador | nada — é o seed |
| `qa-emulator-seed@example.com` | só emulador | já apagada pelo `pnpm seed` final |
| `qa-trap@example.com` | **nunca existiu** — a trava recusou antes de escrever | nada |
| Emuladores | portas 9099/8080 livres | encerrados |
| `.env` dos 3 apps | backup em `/tmp/qa-env-backup-emu/` | **restaurados byte a byte**, md5 idêntico |
| `firestore-debug.log` | raiz | gitignored |
