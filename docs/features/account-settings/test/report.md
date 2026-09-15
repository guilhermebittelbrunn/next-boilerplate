# Relatório de QA — `account-settings`

- **Branch**: `app/feat/account-settings` (nada foi commitado, nenhuma branch criada).
- **Diretório**: `/Users/guilhermebittelbrunn/conductor/workspaces/next-boilerplate/dubai`.
- **Critérios**: `test/criterios-aceite.md` (seções A–I, formato §9.1). O veredito item a item está aqui.
- **Evidências e2e**: `test/e2e/` (18 prints).

## Placar

| classificação | quantidade |
|---|---|
| ✅ aprovado | 33 |
| ❌ reprovado | **1** (D4) |
| 🔒 não verificável (infra externa) | 4 |

**Rodada 2 (reverificação do D-1)**: o **flash** foi corrigido, mas a **projeção das preferências** não —
e apareceu um defeito novo no formulário de Preferências. **Defeitos de produção abertos: 2.**
Ver a seção "Defeitos".

---

## 1. Gates

Comando exato do CI, **sem cache**:

```bash
pnpm turbo run lint typecheck test --force
# Tasks: 23 successful, 23 total · Cached: 0 cached, 23 total · 51.85s · exit 0
```

| workspace | testes |
|---|---|
| `api` | 315 |
| `app` | 253 (33 arquivos) |
| `@repo/email` | 137 |
| `@repo/auth` | **38** (era 29 antes desta rodada) |
| `@repo/security` | 31 |
| `@repo/internationalization` | 27 (paridade pt-br/en/es + `apiErrors`) |
| `web` | 27 |
| `@repo/shared` | 15 |
| `@repo/payments` | 8 |

`pnpm check`: 504 arquivos, 0 erro.

### Testes criados nesta etapa (todos verdes; nenhum teste foi desativado ou afrouxado)

| arquivo | o que cobre |
|---|---|
| `packages/auth/__tests__/serverSessionRevocation.test.ts` (9) | a correção de segurança: ID token emitido antes da revogação é recusado |
| `apps/api/__tests__/accountMergedPayload.test.ts` | merge Firestore × Firebase Auth, preferências, `avatarUrl` |
| `apps/api/__tests__/accountPasswordRoute.test.ts` | senha atual errada, conta sem senha, throttle, impersonação |
| `apps/app/__tests__/accountApiErrorCopy.test.ts` (17) | cada `error.code` novo tem copy nos 3 idiomas |
| `apps/app/__tests__/accountSecurityForm.test.tsx` | formulário de senha |
| `apps/app/__tests__/postLoginPreferences.test.ts` (10) | precedência `?redirect=` × idioma preferido |
| `apps/app/__tests__/profileDropdownAccount.test.tsx` (4) | item "Minha conta" e ausência de `href="#"` |

**Teste de mutação na correção de segurança**: neutralizando `isMintedBeforeRevocation`
(`packages/auth/server.ts`, forçando `return false`), o `serverSessionRevocation.test.ts` **falha** no caso
certo (`:73` — "stale-id-token" deveria resolver `null`). Arquivo restaurado, 38/38 verdes. O teste de
regressão morde de verdade.

---

## 2. A correção de revogação de sessão, validada no app

Refeita do zero, com **duas contas reais e duas sessões independentes**, sem reaproveitar a medição da
revisão. Contas: **A** = `qa-account-settings-a@example.com` (criada pela UI de cadastro),
**B** = `qa-account-settings-b2@example.com`.

Sessão A#1 = navegador real (login pela UI). Sessão A#2 = `POST /auth/sign-in` + cookie de sessão obtido
em `POST http://localhost:3000/api/auth/session`. A troca de senha foi feita **pela UI**, na aba Segurança.

| probe | antes da troca | depois da troca |
|---|---|---|
| A#2 — `Authorization: Bearer` | `200` | **`401 AUTH_INVALID_TOKEN`** |
| A#2 — cookie `access-token` | `200` | **`401 AUTH_INVALID_TOKEN`** |
| **B** (não envolvida) | `200` | **`200`** — nenhum dano colateral |
| A#1 (o navegador que trocou) | — | deslogado, `→ /es/sign-in?redirect=%2Fes` |
| **login novo com a senha nova** | — | **`200` por bearer e `200` por cookie recém-emitido** |

**Veredito: ✅ a revogação vale nos dois transportes, não vaza para outra conta e não quebra o login
seguinte.** O falso positivo clássico (revogação mal calibrada que mata o próximo sign-in) **não ocorre**:
depois da troca, o sign-in novo devolve `200` nos dois transportes, e a UI entra normalmente.

O botão **"Sair de todos os dispositivos"** foi exercido pelo `AlertDialog` real: **Cancelar** fecha e a
outra sessão continua `200`; **confirmar** derruba a outra sessão nos dois transportes (`401` bearer e
`401` cookie), desloga a atual e deixa **B** intacta (`200`). O `asChild` mexido em
`packages/design-system/components/ui/alert-dialog.tsx` **não quebrou o confirmar** — e não há mais
`<button>` aninhado (`[role="alertdialog"] button` → 2 botões, 0 botões aninhados).
Prints: `09-alertdialog-cerrar-sesiones-claro-es.png`, `08-troca-de-senha-ok-e-signout-es.png`.

---

## 3. IDOR / posse — 3 rotas de `account`, 2 contas reais

Todos os vetores foram disparados como **A** tentando escrever em **B** (docId `qs2hRbLayjFv0BlOgiUS`,
uid `tCf3OavTi4SdljRGUwucCL2xmTF3`):

| vetor | resultado |
|---|---|
| corpo com `id` do doc de B | `400 VALIDATION_FAILED` |
| corpo com `type: "admin"` | `400 VALIDATION_FAILED` |
| header `x-user-id: <uid B>` | `403 AUTH_REQUEST_USER_ID_MISMATCH` |
| header `x-request-user-id: <uid B>` + `x-request-role: admin` | `403 AUTH_REQUEST_PANEL_FORBIDDEN` |
| rota `PUT /account/<docId de B>` | `404` (não existe rota por id) |
| sem credencial | `401 AUTH_INVALID_TOKEN` |
| token lixo | `401 AUTH_INVALID_TOKEN` |
| `avatar` apontando para `users/<uid B>/avatar.png` | `400 ACCOUNT_AVATAR_INVALID` |
| `avatar: "javascript:alert(1)"` | `400 ACCOUNT_AVATAR_INVALID` |

Depois de **todos** os vetores, `GET /account` como B devolve `displayName: null` — **nada foi escrito**.
Corpo vazio devolve `400 ACCOUNT_NOTHING_TO_UPDATE` (não é sucesso silencioso).

---

## 4. Defeitos

### D-1 — ✅ **resolvido em parte** (rodada 2): o flash acabou, a projeção não

**O que foi corrigido e está verificado**: `apps/app/shared/lib/themePreference.ts` passou a ser o
escritor único do tema, e o `ThemeCookieSync` mantém o cookie `x-theme` espelhando o tema ativo. Medido
contra o **contrato declarado** (conta = padrão que semeia navegador sem escolha; toggle do cabeçalho =
override local; cookie sempre espelha o tema ativo):

| caminho | resultado |
|---|---|
| navegador virgem, **sem** `?redirect=` | entra em `/es` **claro** (conta), `x-theme=light`, `localStorage=light` — **sem flash** |
| override pelo toggle do cabeçalho | `x-theme` vira `dark` na hora; sobrevive ao reload |
| override × próximo login | conta diz `light`, navegador **continua `dark`** — override respeitado |
| **teste servidor × DOM** | `curl -H "Cookie: x-theme=light"` → `<html class="… light">`; DOM final `light`. Com `x-theme=dark` → servidor `dark`, DOM `dark`. **Iguais nos dois casos: o flash não voltou.** |

### D-3 — ❌ **a segunda causa NÃO foi corrigida**: com `?redirect=`, nenhuma preferência é projetada

O teste "classe do servidor == classe do DOM" é **insensível** a este defeito: num navegador que já tem
`localStorage.theme`, cookie e DOM ficam coerentes e não há flash **mesmo sem projeção nenhuma**. Flash e
projeção são coisas diferentes e foram conflacionadas.

**Medição — dois roteiros idênticos, navegador virgem (`localStorage` limpo, sem `x-theme`/`x-locale`),
conta com `preferences = { theme: "light", locale: "es" }`:**

| | **A — com `?redirect=`** | **B — sem `?redirect=`** |
|---|---|---|
| URL de entrada | `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` | `/pt-br/sign-in` |
| destino | `/pt-br/entities` | `/es` |
| cookie `x-theme` | **ausente** | `light` |
| cookie `x-locale` | `pt-br` (da URL) | `es` |
| `localStorage.theme` | **null** | `light` |
| classe do DOM | **`dark`** (resolvido pelo SO) | `light` |
| `<html lang>` | **`pt-br`** | `es` |
| veredito | **preferência da conta ignorada** | conta venceu |

Print do roteiro A: `19-redirect-ignora-preferencia-da-conta-ptbr-escuro.png`;
do roteiro B: `20-sem-redirect-conta-vence-es-claro.png`.

**Call site — a leitura de código do orquestrador está correta e eu não achei nenhum caminho alternativo.**
`seedThemeIfUnset` só é alcançado por `projectPreferences`
(`apps/app/shared/lib/postLoginNavigation.ts:32`), cujo **único** chamador é
`resolveDefaultPostLoginForApp` (`:64`). Esse tem dois chamadores, e **os dois retornam antes** quando
existe `?redirect=`:

1. `apps/app/shared/lib/postLoginNavigation.ts:88-91` (`resolveAppPostLoginPath`);
2. `packages/auth/provider.tsx:85-88` — e esse arquivo **não foi modificado** nesta entrega
   (`git diff packages/auth/provider.tsx` vazio).

O próprio teste da entrega fixa o comportamento:
`apps/app/__tests__/postLoginPreferences.test.ts:167` — *"dá precedência ao redirect pedido na query, **sem
consultar o perfil**"*, com `expect(meMock).not.toHaveBeenCalled()`. Ou seja, o caminho está **testado como
não projetando**.

**Impacto**: é exatamente o login por **sessão expirada** (o caso em que a app injeta `?redirect=`). O
objetivo #4 do corte — *"outro navegador, mesma preferência"* — só se cumpre quando a query string não
está lá: entrega **por acidente**.

**Correção sugerida (hipótese)**: projetar as preferências **antes** de decidir o destino, num passo
separado de "para onde ir" — o `redirect` continua vencendo a navegação, mas a semeadura de tema/idioma
roda sempre. Hoje as duas responsabilidades estão na mesma função e o `return` antecipado mata as duas.

### D-4 — ❌ o campo **Idioma** não recarrega o valor salvo e bloqueia o save

**Repro** (conta com `preferences.locale` diferente de `pt-br`, ex.: `es`):

1. Abrir `/{locale}/account?tab=preferences` numa aba nova.
2. O rádio **Tema** vem correto do `form.reset` (mostra `Claro`, o valor da conta) — mas o select
   **Idioma** vem **vazio**: `select.value === ""`, o trigger mostra só o rótulo e, com o dropdown aberto,
   **nenhuma** opção está `data-state="checked"`.
3. Clicar em "Guardar preferencias" → **nenhuma requisição sai** e aparece a mensagem
   **`Invalid option: expected one of "pt-br"|"en"|"es"`** — erro cru do Zod, **não traduzido**, violando a
   regra de ouro 2/3 do repo.

Reproduzido em **aba nova** e após navegação limpa. Só é possível salvar re-escolhendo o idioma na mão.
Fica mascarado quando a conta está em `pt-br`, porque coincide com o `defaultValues` do formulário — foi
por isso que a rodada 1 não pegou.

Print: `21-preferencias-idioma-vazio-apos-reset-es.png` e
`22-idioma-vazio-erro-zod-nao-traduzido-es.png`.

**Escopo**: `HookFormSelect` (`packages/design-system`) está **controlado corretamente** (`value={value}`) e
**não foi tocado**; `AccountPreferencesForm` usa `name="locale"`, que bate com o schema
(`accountFormSchema.ts:103`) e com o DTO (`preferences.locale = "es"`, conferido na resposta da API). O
formulário de **Perfil**, no mesmo `account`, recarrega nome e telefone sem problema. Logo o `reset`
alimenta `theme` e não alimenta `locale` — **causa exata não isolada**, fica para o `/review`.

### D-2 (antigo D-1) — histórico da rodada 1

**Onde**: `apps/app/app/layout.tsx` (primeiro paint pelo cookie `x-theme`, novo nesta feature) ×
`packages/design-system/providers/theme.tsx` (`next-themes`, `localStorage["theme"]`).

**Causa**: `defaultTheme` do `next-themes` só vale quando **não há** valor no `localStorage`. O formulário
de Preferências chama `setTheme`, então os dois ficam em sincronia — mas o **botão de tema do cabeçalho
grava só no `localStorage`, nunca na conta**. A partir daí as duas fontes divergem para sempre naquele
dispositivo.

**Repro executável**:

1. Entrar, `/{locale}/account?tab=preferences` → Tema = **Escuro** → Salvar.
2. Usar o **botão de tema do cabeçalho** e escolher **Claro**.
3. Sair e entrar de novo (a preferência da conta volta para o cookie).

**Medido**: `document.cookie` = `x-theme=dark`; o servidor entrega
`<html class="… scroll-smooth dark">` (confirmado por `curl -H "Cookie: x-theme=dark" …/pt-br/sign-in`);
`localStorage.theme` = `"light"`; `document.documentElement.className` termina em `light` depois da
hidratação. Resultado: **flash escuro → claro em toda carga** e a preferência da conta nunca mais vence
naquele dispositivo.

**Correção sugerida (hipótese, não instrução)**: ou o botão do cabeçalho passa a persistir na conta
(`PUT /account` com `preferences.theme`), fechando a divergência na origem; ou, ao aplicar a preferência no
sign-in, escrever também na chave de storage do `next-themes`. A primeira parece mais coerente com o
objetivo do corte ("tema acompanha a conta"), a segunda é menor.

**Não corrigido aqui** — é código de produção.

### Observações que **não** são defeitos desta feature

- **`getDictionary()` em client component** (apontado pela revisão): **pré-existente confirmado**. No
  `HEAD` da `main` já havia **26 arquivos `"use client"`** chamando `getDictionary` (medido com
  `git show HEAD:<arquivo>`). Além disso, **não houve nenhum aviso de hidratação** no console em
  `/en/account` nem em `/en/entities` — servidor e cliente leem o mesmo cookie, então batem. Fica como
  risco latente, não como regressão.
- **`<html lang>` atrasa um render ao trocar de locale pela URL**: abrir `/pt-br/account` com o cookie em
  `en` renderiza os textos em pt-br mas `lang="en"`; no carregamento seguinte já é `pt-br`. A linha
  `lang={locale || "pt-br"}` **não foi tocada** nesta branch (o root layout está fora de `[locale]` e não
  enxerga o segmento da rota) — pré-existente, com impacto de acessibilidade. Follow-up sugerido.
- **`avatar` aceita qualquer URL http(s) absoluta** (`isUsablePhotoReference`, herdado de
  `entity-photo.ts`, entregue em `file-upload-storage`). `PUT /account` com
  `{"avatar":"https://evil.example.com/a.png"}` devolve `200` e o valor volta em `avatarUrl`. É o contrato
  deliberado (foto do Google no sign-in), mas transforma o avatar em `<img src>` de terceiro — pixel de
  rastreio/vazamento de referer. Fora do escopo do critério E4 (que cobra objeto de outro dono e
  `javascript:`, ambos recusados). Follow-up para o backlog.
- **`POST /auth/sign-in` responde `500` com senha errada** (rota sem `try/catch`, não tocada nesta branch).
  A UI de login trata, mas o código de erro não é traduzível. Pré-existente.
- **Cosmético**: os rótulos do `tablist` ficam colados ("Perfil Segurança Preferências Cobrança") em
  desktop e em 390 px — legível, sem overflow horizontal, mas sem respiro. Visível em todos os prints.

---

## 5. Critérios de aceite — veredito item a item

Legenda do meio de verificação: **e2e** (app dirigido no browser), **api** (probe HTTP contra a API no
ar), **unit** (Vitest), **código** (leitura do diff).

### A. Navegação e estrutura

| # | veredito | meio | evidência |
|---|---|---|---|
| A1 | ✅ | e2e | "Minha conta" do menu do avatar navega para `/pt-br/account`; a sidebar tem os 4 links `?tab=` |
| A2 | ✅ | e2e + unit | `document.querySelectorAll('a[href="#"]').length === 0` na sidebar **e** com o dropdown aberto; Cobrança abre o estado vazio traduzido (`12-billing-vazio-en-escuro-desktop.png`) |
| A3 | ✅ | e2e | `?tab=security` em carga fria → aba Segurança já selecionada; `?tab=bogus` → cai em Perfil |
| A4 | ✅ | e2e | trocar de aba faz `replaceState`; `history.back()` saiu para `?tab=bogus` (a navegação anterior), não para a aba anterior — **custo aceito, registrado** |

### B. Perfil

| # | veredito | meio | evidência |
|---|---|---|---|
| B1 | ✅ | e2e + api | salvar grava `displayName` e `phone`; recarregar traz `"QA Conta A"` / `"+55 51 99999-0000"` (espaços laterais removidos); `{"phone":""}` grava **`null`** |
| B2 | ✅ | e2e | após o `PUT 200` o `GET /account` é refeito e o cabeçalho passa de `qa-account-settings-a` para `QA` na mesma navegação (`04-perfil-salvo-nome-no-header-escuro-ptbr.png`) |
| B3 | ✅ | e2e | nome vazio → "Informe o nome de exibição."; telefone com letras → "Informe um telefone válido (…)"; **0 requisições** ao `PUT /account` nos dois casos |
| B4 | ✅ | e2e + api | campo de e-mail `disabled` com o aviso traduzido; `email` não existe no schema (`.strict()`) |

### C. Senha e sessões

| # | veredito | meio | evidência |
|---|---|---|---|
| C1 | ✅ | e2e + código | o formulário exige os 3 campos; a rota reverifica via `identitySignInWithPassword` antes do `updateUser` |
| C2 | ✅ | e2e + api | `400 ACCOUNT_CURRENT_PASSWORD_INVALID`; toast em espanhol "La contraseña actual es incorrecta." (`07-seguridad-senha-atual-errada-toast-es.png`), sem stack trace |
| C3 | ✅ | api | 5 tentativas erradas → na 6ª vira **`429 USERS_AUTH_RATE_LIMITED`**, com copy nos 3 idiomas; nunca 500 |
| C4 | ✅ | unit | `ACCOUNT_PASSWORD_UNSUPPORTED` coberto em `accountPasswordRoute.test.ts` (conta sem senha exige provedor federado para o e2e) |
| C5 | ✅ | e2e + api | ver a seção 2 — `401` nos **dois** transportes |
| C6 | ✅ | api | conta B segue `200` depois da troca e depois do "sair de todos" |
| C7 | ✅ | e2e + api | login novo → `200` por bearer e por cookie; entrada pela UI funciona |
| C8 | ✅ | e2e + api | Cancelar não revoga; confirmar revoga nos dois transportes e desloga a sessão atual |

### D. Preferências

| # | veredito | meio | evidência |
|---|---|---|---|
| D1 | ✅ | e2e | tema e idioma salvos na conta; após reload **e** após novo sign-in o app abre em `/es` claro (`x-theme`/`x-locale` reescritos no sign-in) |
| D2 | ✅ | e2e | com `localStorage` **e** cookies limpos, entrar por `/pt-br/sign-in` leva a `/es` com tema claro — veio só da conta (`10-preferencia-segue-a-conta-em-navegador-limpo-es-claro.png`) |
| D3 | ✅ | api | `{"preferences":{"theme":"neon"}}` e `{"language":"klingon"}` → `400 VALIDATION_FAILED` |
| D4 | **❌** | e2e | a precedência de navegação funciona (aterrissa em `/pt-br/entities`), **mas o caminho com `?redirect=` não projeta preferência nenhuma** — nem tema, nem idioma. Ver **D-3** na §4. Rodada 1 marcou ✅ porque o navegador já tinha os cookies de rodadas anteriores; com navegador virgem o defeito aparece |
| D5 | ✅ | e2e + código | o cookie de preferência só é reescrito no sign-in/navegação: a sessão longa segue com o valor antigo até o próximo login — é o comportamento projetado |

⚠️ **Rodada 2.** D1 e D2 seguem ✅: revalidados em navegador virgem, com o contrato declarado pelo
`/review` (conta = padrão que semeia quem não escolheu; toggle do cabeçalho = override local; cookie sempre
espelha o tema ativo). O flash acabou — servidor e DOM entregam a mesma classe. Mas **D4 vira ❌**: a
projeção não acontece quando existe `?redirect=` (**D-3** na §4), e o **campo Idioma não recarrega o valor
salvo** (**D-4** na §4), o que deixa a tela de Preferências sem save até o usuário reescolher o idioma.

### E. Avatar

| # | veredito | meio | evidência |
|---|---|---|---|
| E1 | 🔒 | — | Cloud Storage desativado em `next-boilerplate-576d0`; caminho feliz do upload não é verificável nesta máquina |
| E2 | ✅ | e2e + api | `POST /files` com PNG válido → **`503 UPLOAD_FAILED`** (nunca 500); na UI, "No se pudo subir el archivo ahora. Inténtalo en unos instantes."; as outras abas seguem funcionando (`11-upload-degradado-503-traduzido-es.png`) |
| E3 | ✅ | unit + código | `resolveAvatarUrl` devolve `null` quando não consegue assinar e a leitura da conta não falha; coberto em `accountAvatar.test.ts` |
| E4 | ✅ | api | objeto sob o prefixo de outro usuário e `javascript:` URL → `400 ACCOUNT_AVATAR_INVALID`, nada gravado |
| E5 | 🔒 | — | exige bucket ativo para observar a exclusão do objeto anterior; a ordem (apagar só depois da escrita) está no código e coberta por teste de rota |

### F. Autorização e posse

| # | veredito | meio | evidência |
|---|---|---|---|
| F1 | ✅ | api | tabela da seção 3 |
| F2 | ✅ | api | sem credencial e com token lixo → `401 AUTH_INVALID_TOKEN` |
| F3 | ✅ | unit | guard `requireCommonPanelApi` coberto em `accountRoute.test.ts`; sem conta órfã de perfil não dá para exercer e2e |
| F4 | ✅ (rota) / 🔒 (visual) | unit + api | `PUT`, troca de senha e revogação sob impersonação → `403` em `accountRoute.test.ts` / `accountPasswordRoute.test.ts`. O **aviso visual de somente leitura e os `Footer` desabilitados** não foram vistos: não há conta admin de QA nesta máquina |
| F5 | ✅ | api | `{"type":"admin"}` e headers forjados → `400` / `403`; nenhuma escrita |
| F6 | ✅ | api | corpo vazio → `400 ACCOUNT_NOTHING_TO_UPDATE` |

### G. Dados e contrato

| # | veredito | meio | evidência |
|---|---|---|---|
| G1 | ✅ | api | `GET /account` devolve `phone: "+55 51 99999-0000"` (Firestore) **junto** de `phoneNumber: null` (Auth); `preferences.theme` presente |
| G2 | ✅ | api | `createdAt`/`updatedAt`/`deletedAt` chegam como ISO (`2026-09-15T11:50:13.319Z`), nenhum `Timestamp` cru |

### H. i18n, tema e responsivo

| # | veredito | meio | evidência |
|---|---|---|---|
| H1 | ✅ | unit + e2e | paridade dos 3 idiomas verde (`@repo/internationalization`, 27 testes); UI percorrida em **pt-br, en e es** |
| H2 | ✅ | unit + api | `accountApiErrorCopy.test.ts` (17); `USERS_AUTH_RATE_LIMITED`, `ACCOUNT_CURRENT_PASSWORD_INVALID` e `UPLOAD_FAILED` conferidos nos 3 dicionários e vistos traduzidos na tela |
| H3 | ✅ | e2e | 4 abas em **claro** e **escuro**, **desktop (1440×900 / 1280)** e **390 px**; `scrollWidth === innerWidth` em 390 px (sem overflow horizontal) |

### I. Gates

| # | veredito | meio | evidência |
|---|---|---|---|
| I1 | ✅ | gate | `pnpm turbo run lint typecheck test --force` → **23/23, 0 cached, exit 0** |
| I2 | ✅ | mutação | ver seção 1 — o teste de regressão falha quando a checagem é neutralizada |

---

## 6. Evidências e2e

Todos em `docs/features/account-settings/test/e2e/`. Temas/viewports/idiomas cobertos: **claro + escuro**,
**desktop (1280 e 1440×900) + 390×844**, **pt-br + en + es**.

| # | print | o que prova |
|---|---|---|
| 01 | `01-pos-signin-tema-e-idioma-da-conta-dark-es.png` | tema e idioma da conta já no pós-login |
| 02 | `02-sidebar-configuracion-sem-href-hash-dark-es.png` | sidebar sem `href="#"` |
| 03 | `03-account-perfil-escuro-desktop-ptbr.png` | 4 abas, escuro, desktop, pt-br |
| 04 | `04-perfil-salvo-nome-no-header-escuro-ptbr.png` | cabeçalho atualiza sem reload |
| 05 | `05-preferencias-tema-claro-desktop-ptbr.png` | tema claro aplicado e salvo |
| 06 | `06-preferencias-es-tema-claro-desktop.png` | idioma `es` aplicado |
| 07 | `07-seguridad-senha-atual-errada-toast-es.png` | toast traduzido, sem stack trace |
| 08 | `08-troca-de-senha-ok-e-signout-es.png` | troca de senha desloga a sessão atual |
| 09 | `09-alertdialog-cerrar-sesiones-claro-es.png` | `AlertDialog` funcional pós-`asChild` |
| 10 | `10-preferencia-segue-a-conta-em-navegador-limpo-es-claro.png` | preferência vem só da conta |
| 11 | `11-upload-degradado-503-traduzido-es.png` | modo degradado do storage |
| 12 | `12-billing-vazio-en-escuro-desktop.png` | Cobrança = estado vazio traduzido, en, escuro |
| 13 | `13-devtools-2-issues-hidratacao-en-escuro.png` | overlay do dev server (sem erro de hidratação no console) |
| 14 | `14-perfil-mobile-390-escuro-en.png` | Perfil em 390 px |
| 15 | `15-seguranca-mobile-390-escuro-en.png` | Segurança em 390 px |
| 16 | `16-preferencias-mobile-390-escuro-en.png` | Preferências em 390 px |
| 17 | `17-seguranca-desktop-claro-ptbr.png` | Segurança, claro, 1440×900, pt-br |
| 18 | `18-redirect-tem-precedencia-sobre-idioma-ptbr.png` | `?redirect=` vence o idioma preferido |

---

## 7. O que falta testar

- **E1 / E5** (caminho feliz do avatar e exclusão do objeto anterior): exigem **Cloud Storage ativo** em
  `next-boilerplate-576d0`. Hoje `firebasestorage…/o` devolve 404.
- **Rate limit do Arcjet**: sem `ARCJET_KEY` a camada é no-op (o log da API diz
  `rate limiting is DISABLED`). O throttle que **foi** verificado é o do Identity Toolkit (C3), que é outra
  camada.
- **F4 visual** (aviso de somente leitura + `Footer` desabilitados sob impersonação): precisa de uma conta
  **admin** de QA. A recusa de escrita já está provada por teste de rota.
- **Provedor federado** (conta sem senha, `ACCOUNT_PASSWORD_UNSUPPORTED`): só por Google sign-in real;
  hoje coberto por teste de rota.
- **Build de produção**: o e2e rodou em `next dev`. Nenhum achado depende do dev server (as medições de
  tema foram confirmadas com `curl` no HTML servido), mas o defeito **D-1** merece reconfirmação em
  `pnpm --filter app build && start` antes do merge.

## 8. Estado de dev alterado (limpeza)

Contas de QA criadas/alteradas nesta rodada, no projeto Firebase `next-boilerplate-576d0`:

| conta | estado |
|---|---|
| `qa-account-settings-a@example.com` | **criada** aqui; senha trocada durante o teste; `displayName = "QA Conta A"`, `phone = null`, `preferences = { theme: dark, locale: en }` |
| `qa-account-settings-b2@example.com` | **criada** aqui; intacta (nenhuma escrita); ficou **throttled** pelo Identity Toolkit por causa do teste C3 — destrava sozinha |
| `qa-account-settings-b@example.com` | de rodada anterior; senha desconhecida (`sign-in` devolve 500) |
| `rv-a@example.com`, `rv-b@example.com` | da revisão |

Nenhuma senha foi gravada em arquivo. O harness temporário (`/tmp/qa-*.sh`, `/tmp/qa-*.tok`,
`/tmp/qa-avatar.png`) foi apagado no fim da execução. Nenhum dado de produção foi tocado.

## 9. Recomendação

**Liberar para o `/review` com uma ressalva.** O objetivo de segurança do corte (a troca de senha encerra
as demais sessões) está provado de ponta a ponta, nos dois transportes, sem dano colateral e **sem quebrar
o login seguinte** — e agora tem teste de regressão que morde. Os gates passam sem cache. O único defeito
de produção é o **D-1** (tema da conta perde para override local do botão do cabeçalho, com flash): é
médio, não bloqueia o corte e tem correção pequena, mas deve ser decidido antes do merge porque contradiz
a promessa "tema acompanha a conta".

---

## 10. Rodada 2 — reverificação do D-1 (fecho do loop)

Escopo estreito: só o D-1 e o objetivo #4. Os 33 critérios que já haviam passado **não** foram refeitos.

**Gates (medidos pelo orquestrador nesta rodada)**: `pnpm check` 506 arquivos / 0 erro;
`pnpm turbo run lint typecheck test --force` **23/23, Cached: 0**; `app` **34 arquivos / 259 testes**.
Mutação em `themePreference.ts` (remover a guarda `chosenTheme()` de `syncThemeCookieWithChoice`) faz
falhar o caso *"never writes a cookie for a browser that made no choice"* — o teste morde.

**Veredito do objetivo #4 do corte** — *"o usuário escolhe tema e idioma, e a escolha acompanha a conta —
outro navegador, mesma preferência"*: **❌ entregue por acidente da query string.** Em navegador virgem
funciona **sem** `?redirect=` e **não funciona com** `?redirect=` — que é justamente o login por sessão
expirada. Evidência lado a lado na §4, defeito **D-3**.

**Contas de QA desta rodada**: nenhuma nova. Foi reutilizada
`qa-account-settings-a@example.com`, cujas preferências ficaram em `{ theme: "light", locale: "es" }` e a
senha segue `NovaSenha2026!x` (a mesma da rodada 1, não registrada em lugar nenhum além desta sessão).
A lista completa para limpeza continua na §8.

**Recomendação atualizada**: **não fechar a feature nesta rodada.** O objetivo de segurança (#3) está
sólido e testado; o objetivo #4 **não** está — falha no caminho mais comum de re-login, e a própria tela de
Preferências não recarrega o idioma salvo. Os dois defeitos são de produção, pequenos e localizados, e
foram devolvidos sem correção (teto de rodadas atingido).
