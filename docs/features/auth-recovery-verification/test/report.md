# Relatório de QA — Recuperação de senha e verificação de e-mail

- **Slug**: `auth-recovery-verification`
- **Data**: 2026-09-10
- **Branch**: `feat/auth-recovery-verification` (**não protegida** — nenhum bloqueio; nada commitado por
  mim, os testes novos ficam no working tree para o `/review`)
- **Escopo**: o diff da feature + as dependências que ele alcança (`packages/design-system/hooks/useAlert.ts`
  atinge os 3 apps)
- **Veredito**: **aprovado com 3 pendências de fronteira e 1 defeito novo encontrado (fora do escopo)**.
  Os 5 itens do corte de MVP estão provados, incluindo o item 5, que na etapa anterior só valia em dark.

---

## 1. Resumo executivo

O que esta rodada acrescentou às duas anteriores:

1. **Reproduzi o defeito de contraste na condição exata em que ele acontecia** — preferência de tema
   `"system"` (o default de um fork novo) + sistema operacional em light — e provei que a correção resolve:
   `theme--light`, `rgb(117,117,117)` sobre branco, **contraste 4,61:1 (AA)**. Antes era 1:1. As duas
   etapas anteriores não tinham visto porque o navegador resolvia para dark.
2. **Travei a regressão com teste**: `apps/app/__tests__/alertTheme.test.ts`. Verifiquei que ele é um
   guarda real — contra o `useAlert.ts` de `HEAD` (pré-correção) **8 dos 11 casos falham**.
3. **Reproduzi a anti-enumeração de forma independente** e cheguei ao **mesmo SHA1 de screenshot
   (`ac21e722…`) que o `/develop` mediu** — dois agentes, duas rodadas, hash idêntico.
4. **Confirmei o resíduo de timing (D-A) com medição própria** e registrei-o como critério de aceite
   honesto, não como item fechado.
5. **Cobri o hook `useEmailVerification`, que não tinha nenhum teste** — inclusive o caso que o defeito
   3.3 do `/develop` exigia (uma falha ao reler a sessão não pode transformar uma confirmação
   bem-sucedida em erro).
6. **Achei um defeito novo**, pré-existente e fora do diff: o painel de depoimento das telas de auth
   renderiza sempre o idioma da navegação **anterior** (§6).

---

## 2. Testes executados — resultado real

Todos os comandos abaixo foram rodados **depois** de escrever os testes novos, com `--force` para não ler
cache do turbo.

| gate | comando | resultado |
|---|---|---|
| Lint/format | `pnpm check` | ✅ **456 arquivos, 0 erro** |
| CI completo (o que o GitHub Actions roda) | `pnpm turbo run lint typecheck test --force` | ✅ **23/23 tasks, 0 cached** |
| Gate do build (root) | `pnpm test` | ✅ **9/9 tasks** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | ✅ **3 arquivos / 27 testes**, incl. `parity.test.ts` |

### Contagem por workspace, antes × depois

Medido com `--force` nas duas pontas. **As contagens do handoff §6 estavam erradas** (dizia 25 arquivos /
228 testes na `apps/api`); a base real era 22/195. Use estes números.

| workspace | antes | depois | delta |
|---|---|---|---|
| `apps/api` | 22 arquivos / **195** testes | 22 arquivos / **203** testes | **+8** |
| `apps/app` | 24 arquivos / **170** testes | 26 arquivos / **188** testes | **+2 arquivos, +18** |
| `apps/web` | 4 / 27 | 4 / 27 | — |
| `@repo/email` | 7 / 137 | 7 / 137 | — |
| `@repo/auth` | 2 / 29 | 2 / 29 | — |
| `@repo/internationalization` | 3 / 27 | 3 / 27 | — |
| `@repo/security` | 3 / 31 | 3 / 31 | — |
| `@repo/shared` | 1 / 15 | 1 / 15 | — |
| `@repo/payments` | 1 / 8 | 1 / 8 | — |
| **total novo** | | | **+26 testes** |

### `securityPolicySources.test.ts` — não falhou, e a fragilidade tem explicação

Rodei 3 passes isolados e vários dentro da suíte completa. **Nunca falhou.** Mas a medição isolada explica
o risco melhor que a suspeita original:

| contexto | duração |
|---|---|
| isolado (`vitest run __tests__/securityPolicySources.test.ts`) | **216 ms · 618 ms · 228 ms** |
| dentro da suíte completa da `apps/app` | **1824–2203 ms** |

O arquivo é ~3–8× mais lento **sob contenção de CPU** do que sozinho, contra um `testTimeout` default de
5 s que nenhuma das 9 configs de Vitest sobrescreve. Num runner de CI carregado (menos vCPU, mais
paralelismo relativo) essa margem encosta. **Recomendação**: declarar `testTimeout` explícito na config da
`apps/app` — barato e determinístico. Não apliquei: é configuração fora do escopo desta feature.

---

## 3. Testes criados

Prioridade por retorno, como pedido. Todos passam; nenhum é tautológico.

### 3.1 `apps/app/__tests__/alertTheme.test.ts` — **11 testes** (novo)

O guarda de contraste que o `/review` deixou como lacuna. Assere que o tema entregue ao `react-toastify` é
sempre `"light"` ou `"dark"` — nunca a preferência crua `"system"` — nas 5 combinações que o `next-themes`
pode devolver (incluindo `resolvedTheme` ainda `undefined` antes da hidratação) e nas 4 variantes de alerta.

**Prova de que é guarda real**, não teste decorativo:

| versão de `useAlert.ts` | resultado |
|---|---|
| working tree (com a correção) | **11/11 passam** |
| `git show HEAD:…` (pré-correção, `theme` cru) | **8/11 falham** |

**Decisão registrada**: o teste mora em `apps/app`, não em `packages/design-system`. O pacote não tem
suíte Vitest (sem `vitest.config.mts`, sem script `test`, sem devDependency) e criar uma significaria uma
task nova no grafo do turbo, config e dependências — desproporcional para um caso. O alias `@repo` da
`apps/app` já resolve `@repo/design-system/hooks/useAlert`, e a `apps/app` é o consumidor principal. Se
`packages/design-system` ganhar suíte no futuro, o teste migra sem alteração.

### 3.2 `apps/app/__tests__/useEmailVerification.test.tsx` — **7 testes** (novo)

O hook não tinha **nenhum** teste. Cobre:

- o reenvio pede na língua que está sendo navegada e confirma com copy lida do dicionário;
- uma recusa do reenvio chega à tela como `error.code` traduzido, com o `FormattedError` recebendo o erro
  cru **e** o locale certo (é a cadeia que o defeito de contraste rompia);
- a confirmação relê o registro da conta (as duas metades que o defeito 3.3 exigia);
- **uma falha ao reler a sessão não transforma uma confirmação bem-sucedida em erro** — o `.catch()` do
  `/develop` agora está travado por teste;
- um `oobCode` recusado não dispara o reload;
- a recusa da confirmação fica para a tela renderizar, não vira toast (esta mutation não tem `onError` de
  propósito).

### 3.3 `apps/api/__tests__/authPasswordReset.test.ts` — **+5** (16 → 21)

- link já gasto → `AUTH_OOB_CODE_INVALID`, **e as sessões não são revogadas duas vezes**;
- `oobCode` acima de 2048 → `VALIDATION_FAILED` sem chamar o provedor;
- senha acima de 1024 → 400 sem chamar o provedor;
- exatamente 6 e exatamente 1024 caracteres **são** aceitos (os dois extremos do intervalo);
- a revogação mira a conta que o **provedor** devolveu, não um `email` injetado no corpo — fecha o vetor
  de "revogar a sessão de outra pessoa".

### 3.4 `apps/api/__tests__/authEmailVerification.test.ts` — **+3** (14 → 17)

- código gasto por uma visita anterior → `AUTH_OOB_CODE_INVALID` (recarregar a página e o prefetch de
  cliente de e-mail são o caso ordinário);
- `oobCode` acima de 2048 → 400 sem chamar o provedor;
- exatamente 2048 é aceito.

### 3.5 O que decidi **não** testar, e por quê

| lacuna | decisão |
|---|---|
| `emailVerified` como efeito do reset (item 5 do briefing) | **Não é testável em unitário** — é comportamento do `accounts:resetPassword` do Identity Toolkit, não do nosso código. Um teste "não mexemos na flag" seria tautológico (não mockamos nada que a alteraria). Virou **critério de aceite explícito** + registro nesta seção. O `/develop` observou ao vivo; eu não repeti porque exige `oobCode` real (§5, fronteira). |
| Timing constante no `reset-request` (D-A) | Um teste que exigisse duração independente da existência da conta **falharia hoje** — D-A foi aceita como resíduo. Escrever um teste vermelho de propósito é pior que registrar. Virou critério de aceite que mede e admite a divergência. |
| `reloadCurrentUser` em `packages/auth` | O `/review` recomendou fechar aqui. Cobri o comportamento **do lado do consumidor** (§3.2), que é onde o defeito 3.3 doía. Um teste em `packages/auth/__tests__/firebaseClient.test.ts` assertando `reload` + `getIdToken(true)` continua barato e vale — **deixo recomendado, não feito**, para manter o diff de QA restrito ao que muda o veredito. |
| V9 (banner sob impersonação) por browser | Concordo com o `/review`: já é determinístico em `emailNotVerifiedNotice.test.tsx` (4 termos do guard) **e** no servidor (`resolveApiActor`). Dirigir impersonação real exigiria criar admin + comum com perfil no Firestore — custo alto, ganho nulo. |

---

## 4. Critérios de aceite — status item a item

Checklist completo em [`criterios-aceite.md`](criterios-aceite.md). Meio de verificação:
**U** unit/rota · **H** hook/componente · **E** e2e (browser) · **A** API direta (curl) · **M** manual/observado.

### Item 1 do corte — pedir a redefinição a partir do login

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| 1.1 | login oferece "esqueci minha senha" | **PASS** | E | `01-sign-in-forgot-link-light.png`; snapshot com `url=…/forgot-password` |
| 1.2 | tela de pedido valida o e-mail com copy traduzida | **PASS** | E+U | `03-forgot-invalid-email-light.png` ("Email inválido"); `authSchemas.test.ts` |
| 1.3 | clique repetido não dispara dois pedidos | **PASS** | E | 3 cliques rápidos → **delta=1** requisição `reset-request` no log da API |

### Item 2 do corte — link e senha nova na nossa tela

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| 2.1 | link aponta para a nossa página, nunca a hospedada | **PASS** | U | `authActionLinks.test.ts` — *"never points at the Firebase hosted handler"*, *"escapes an action code carrying url characters"*, guard de base ausente |
| 2.2 | e-mail no idioma navegado; locale inválido recusado | **PASS** | U | `authPasswordReset.test.ts` — locale `es` repassado, fallback `pt-br`, `fr` → 400 |
| 2.3 | sem `oobCode` → "Link inválido", sem formulário | **PASS** | E | `06-reset-no-code-invalid-link-light.png`; `inputs: 0` lido do DOM |
| 2.4 | senhas têm de conferir; limites 6–1024 | **PASS** | E+U | `07-reset-password-mismatch-light.png` ("As senhas não conferem"); 4 testes de limite novos |
| 2.5 | ciclo completo termina com login pela senha nova | **PASS** (herdado) | M | V5 do `/develop`; **não repetido** — exige `oobCode` real (§5) |

### Item 3 do corte — a redefinição encerra as sessões

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| 3.1 | reset invalida a sessão em todos os apps | **PASS** (parcial) | U+M | `authPasswordReset.test.ts` — *"ends every open session…"*; V6 do `/develop` na `apps/app`. **`apps/web` não verificada** (§5) |
| 3.2 | revogação mira a conta do `oobCode`, não o corpo | **PASS** | U | **teste novo** — `email` injetado no corpo é ignorado |
| 3.3 | falha na revogação não desfaz a troca | **PASS** | U | `authPasswordReset.test.ts` — *"still confirms when the sessions could not be revoked"* |
| 3.4 | link usado/expirado → código estável | **PASS** | U+E | `it.each` de 5 códigos + **teste novo** de código gasto; `08-reset-invalid-code-toast-light.png` |

### Item 4 do corte — cadastro dispara verificação e o app avisa

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| 4.1 | cadastro dispara verificação sem bloquear a entrada | **PASS** | E | cadastro real pela UI → `POST /auth/email-verification/send` no log **e** usuário no painel |
| 4.2 | painel avisa quem não confirmou; some ao confirmar | **PASS** | E+H | `15-email-notice-after-signup-light.png`; `emailNotVerifiedNotice.test.tsx` + **teste novo** do reload |
| 4.3 | admin personificando não vê nem dispara | **PASS** | H+U | `emailNotVerifiedNotice.test.tsx` (4 termos); `authEmailVerification.test.ts` — *"mails the actor, never an address taken from the body"* |
| 4.4 | reenvio protegido contra rajada | **PASS** | E+U | 2 cliques em voo → **1** requisição (o botão sai do DOM acessível durante o `loading`); `corsOrigin.test.ts` cobre os 4 paths |
| 4.5 | reenviar não vira beco sem saída | **PASS** | E+U | `16-resend-toast-light.png` — *"Não foi possível **enviar** … Tente de novo em instantes."* + `POST … 503`; teste de regressão contra `AUTH_EMAIL_VERIFICATION_FAILED` |
| 4.6 | confirmar retira o aviso; estados de link inválido | **PASS** | E | `10-verify-email-no-code-light.png`, `11-verify-email-expired-or-used-light.png` ("O link pode ter expirado ou já ter sido usado"); sucesso herdado do V8 |
| 4.7 | falha ao reler não vira erro | **PASS** | H | **teste novo** — *"still reports success when the session refresh fails"* |

### Item 5 do corte — erros traduzidos **e legíveis**

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| 5.1 | os 6 `error.code` nos 3 idiomas | **PASS** | U | `parity.test.ts` ✅; `grep` confirma 3 ocorrências de cada um dos 6 |
| 5.2 | **código traduzido chega LEGÍVEL nos dois temas** | **PASS** | E+H | ver §4.1 abaixo — medido nos 2 temas, 3 idiomas, + **11 testes novos** |
| 5.3 | fork sem remetente diz isso, não finge sucesso | **PASS** | E+A | `23-email-not-configured-toast-light.png` ("O envio de e-mails não está configurado…"); curl 503 nos dois endereços |
| 5.4 | nenhuma string de UI solta | **PASS** (herdado) | — | verificado pelo `/review` por `rg`; reconferido nas telas em 3 idiomas |

#### 4.1 O critério que estava só nominalmente entregue — agora medido

Reproduzi a condição **exata** do defeito: preferência de tema `"system"` (default de fork novo) +
`agent-browser set media light`. Confirmado no DOM antes de disparar: `themePref: "system"`,
`htmlClass: ["light"]`, `bodyBg: lab(100 0 0)`.

| cenário | classe do toast | `color` | `background` | contraste | legível |
|---|---|---|---|---|---|
| light (`system` → light) | `theme--light` | `rgb(117,117,117)` | `rgb(255,255,255)` | **4,61:1** | ✅ AA |
| dark (`system` → dark) | `theme--dark` | `rgb(255,255,255)` | `rgb(18,18,18)` | **18,73:1** | ✅ AAA |
| **antes da correção (light)** | `theme--system` | `rgb(255,255,255)` | branco | **1:1** | ❌ |

E nos 3 idiomas, em light, todos a 4,61:1:

| idioma | `AUTH_OOB_CODE_INVALID` na tela |
|---|---|
| pt-br | "Este link não é válido. Peça um novo." |
| en | "This link is not valid. Request a new one." |
| es | "Este enlace no es válido. Solicita uno nuevo." |

### Segurança — anti-enumeração

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| S.1 | resposta idêntica para conta existente × inexistente | **PASS** | A+E | corpo `cmp` **byte-idêntico** em 3 pares; **20 headers sem diferença** (só `Date`); screenshots **04 e 05 com SHA1 idêntico `ac21e722…`** — o mesmo hash que o `/develop` mediu, reproduzido de forma independente |
| S.2 | falha de entrega também não revela | **PASS** | A+U | 200 `{requested:true}` com provedor falhando; `EMAIL_NOT_CONFIGURED` idêntico nos dois endereços (curl) |
| S.3 | log não carrega o endereço | **PASS** | A | log da API: `[auth-action-link] refused kind=reset-password code=auth/internal-error` — **sem e-mail** |
| S.4 | **oráculo por tempo — resíduo D-A** | **RESÍDUO ACEITO, medido** | A | conhecido **548 / 597 / 716 ms** × desconhecido **278 / 288 / 287 ms** — **zero sobreposição em 3 pares**. Ver nota abaixo |

> ⚠️ **Meus números do lado "conhecido" são um piso, não o valor real.** Durante a medição o Firebase já
> estava estrangulando a geração de links (`refused code=auth/internal-error` no log), então o caminho da
> conta conhecida **não chegou a executar `sendEmail`** e ainda assim foi ~2× mais lento. Com o gerador
> saudável a diferença é maior — o `/review` mediu 1127–1265 ms. Ou seja: o oráculo é **pior** do que a
> minha amostra sugere, e a conclusão de D-A se mantém em ambas as medições independentes.

### Autorização e rotas públicas

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| A.1 | 3 rotas públicas sem sessão; `send` exige | **PASS** | U | `authEmailVerification.test.ts` — *"refuses a caller with no session"*, *"needs no session: the action code is the credential"* |
| A.2 | visitante logado não perde o `oobCode` | **PASS** | E | logado + `/reset-password?oobCode=X` → **fica, `keptCode: true`, formulário renderizado** (`17-…png`); logado + `/forgot-password` → **bounce para `/pt-br`** (isenção não vazou) |
| A.3 | 4 rotas sob rate limit pelo path real | **PASS** (config) | U | `corsOrigin.test.ts` (+2); 429 real **não observado** (§5) |

### Efeitos do provedor, limites, tema/idioma

| # | critério | status | meio | evidência |
|---|---|---|---|---|
| P.1 | reset marca `emailVerified` — efeito documentado | **PASS por observação** | M | observado pelo `/develop` (handoff §8.3). **Não é testável em unitário** (§3.5). Agora tem critério de aceite explícito |
| P.2 | estrangulamento do Firebase degrada com graça | **PASS** | A+E | reproduzido sem querer durante a medição: público seguiu **200 sucesso**, reenvio autenticado **503 `EMAIL_SEND_FAILED`** |
| L.1 | limites recusados na borda sem tocar no provedor | **PASS** | U | **6 testes novos** (2048/2049, 6/1024/1025) + os existentes de vazio/espaços |
| L.2 | manipular a URL não dá acesso a nada | **PASS** | E | `?oobCode=lixo` → `AUTH_OOB_CODE_INVALID` traduzido, formulário preservado |
| T.1 | 4 telas + banner em light, dark e mobile | **PASS** | E | 390×844 com `scrollWidth == innerWidth == 390` em ambas as telas medidas; `13`, `14`, `18`, `19` |
| T.2 | `Table` antd respeita o tema | **PASS** | E | dark: cabeçalho `lab(15.2 0 0)`, texto `lab(98.3 0 0)`, `htmlDark: true` — `20-entities-table-dark-with-notice.png` |
| T.3 | 3 idiomas sem chave faltando | **PASS** | E | telas + banner + toasts em pt-br/en/es (`12-*`, `21-*`, `22-*`) |

### Fronteiras — NÃO aprovadas

| # | critério | status | por quê |
|---|---|---|---|
| F.1 | **entrega real do e-mail** | ⛔ **NÃO COBERTO** | Exige domínio com SPF/DKIM verificado no Resend — passo manual de DNS. Usei placeholder local. **Não conte como aprovado.** |
| F.2 | ciclo com `oobCode` real do Resend (V5/V6) | **NÃO REPETIDO** | Mesma fronteira. Fico com a prova do `/develop` + os 38 testes de rota |
| F.3 | 429 real do rate limit | **NÃO COBERTO** | `ARCJET_KEY` vazia; a API avisa no boot que o rate limiting está desligado |
| F.4 | revogação cruzando para `apps/web` | **NÃO COBERTO** | Provada só na `apps/app` |
| F.5 | corrida cadastro × navegação (D-D) | **ACEITO como degradação graciosa** | Observado completando (`POST … 503` registrado após o redirect), mas é ordenação favorável, não garantia |

---

## 5. Validação executável — evidências

`agent-browser` **0.27.0**, comandos **estritamente em sequência**. `apps/app` :3000 + `apps/api` :3002,
contra o projeto Firebase real. **23 screenshots** em [`e2e/`](e2e/) (1,1 MB).

| # | arquivo | o que prova | tema/viewport |
|---|---|---|---|
| 01 | `01-sign-in-forgot-link-light.png` | link no rodapé do login | light / desktop |
| 02 | `02-forgot-password-light.png` | tela de pedido | light / desktop |
| 03 | `03-forgot-invalid-email-light.png` | validação Zod traduzida | light / desktop |
| 04 | `04-forgot-sent-unknown-address-light.png` | painel para endereço **desconhecido** | light / desktop |
| 05 | `05-forgot-sent-known-address-light.png` | **SHA1 idêntico ao 04** — anti-enumeração na tela | light / desktop |
| 06 | `06-reset-no-code-invalid-link-light.png` | "Link inválido", sem formulário | light / desktop |
| 07 | `07-reset-password-mismatch-light.png` | "As senhas não conferem" | light / desktop |
| 08 | `08-reset-invalid-code-toast-light.png` | **toast legível em light** (4,61:1) | light / desktop |
| 09 | `09-reset-invalid-code-toast-dark.png` | mesmo toast em dark (18,73:1) | dark / desktop |
| 10 | `10-verify-email-no-code-light.png` | verify-email sem código | light / desktop |
| 11 | `11-verify-email-expired-or-used-light.png` | copy de expirado/já usado | light / desktop |
| 12 | `12-forgot-password-{en,es}-light.png` | 3 idiomas da tela de pedido | light / desktop |
| 13 | `13-forgot-password-mobile-light.png` | sem overflow (390 = 390) | light / mobile |
| 14 | `14-reset-password-mobile-dark.png` | sem overflow, tema respeitado | dark / mobile |
| 15 | `15-email-notice-after-signup-light.png` | banner após cadastro real | light / desktop |
| 16 | `16-resend-toast-light.png` | **copy corrigida de D-C, legível em light** | light / desktop |
| 17 | `17-signed-in-keeps-oobcode-light.png` | logado mantém o `oobCode` | light / desktop |
| 18 | `18-email-notice-dark.png` | banner em dark | dark / desktop |
| 19 | `19-email-notice-mobile-dark.png` | banner em mobile dark | dark / mobile |
| 20 | `20-entities-table-dark-with-notice.png` | `Table` antd respeita o tema | dark / desktop |
| 21 | `21-email-notice-{en,es}-light.png` | banner nos 3 idiomas | light / desktop |
| 22 | `22-oob-invalid-toast-{en,es}-light.png` | `error.code` traduzido nos 3 idiomas | light / desktop |
| 23 | `23-email-not-configured-toast-light.png` | fork sem remetente não finge sucesso | light / desktop |

**Cobertura de tema/viewport**: light desktop, dark desktop, light mobile (390×844), dark mobile (390×844).
**Idiomas**: pt-br, en, es.

### Fluxos dirigidos de ponta a ponta

1. Login → "Esqueci minha senha" → pedido inválido → pedido válido (desconhecido e conhecido).
2. `/reset-password` sem código, com código inválido, com senhas divergentes, com senhas iguais.
3. `/verify-email` sem código e com código inválido.
4. **Cadastro real pela UI** com conta descartável → painel → banner → reenvio → toast.
5. Logado × `oobCode`: fica em `/reset-password?oobCode=X`, é mandado para casa em `/forgot-password`.
6. Logout pelo menu do usuário → volta a `/sign-in?redirect=%2Fpt-br`.
7. `/entities` com o `Table` antd em dark, convivendo com o banner.

---

## 6. Defeito novo encontrado — fora do escopo desta feature

### 🟡 O painel de depoimento das telas de auth mostra sempre o idioma da navegação anterior

`apps/app/app/[locale]/(unauthenticated)/layout.tsx:11` — **não está no diff da feature.**

O layout é Server Component e lê `await getDictionary()` de `@repo/internationalization/server`, que
resolve o idioma pelo cookie `x-locale`. O cookie é escrito **depois** do render, então o painel fica um
passo atrás. Medido navegando em sequência:

| rota | `h1` (correto, vem do route param) | depoimento (errado) |
|---|---|---|
| `/pt-br/forgot-password` | "Esqueci minha senha" | **es** — "Esta biblioteca me ha ahorrado…" |
| `/en/forgot-password` | "Forgot your password" | **pt-br** — "Essa biblioteca me salvou…" |
| `/es/forgot-password` | "Olvidé mi contraseña" | **en** — "This library has saved me…" |

**Pré-existente, não introduzido aqui** — confirmei em `/en/sign-in` e `/es/sign-up`, que não passam por
nenhuma rota nova. A copy **da feature** está correta nos 3 idiomas em todas as telas; só o painel
decorativo do layout compartilhado erra. Não bloqueia. Recomendação: item de backlog junto de D-B (as duas
são a mesma classe — resolução de configuração/idioma no servidor divergindo do que a rota pede).

---

## 7. Pendências e recomendações

| # | pendência | recomendação |
|---|---|---|
| 1 | **Entrega real de e-mail nunca provada** (F.1) | Bloqueia o "sinal de pronto" da spec. Precisa de `RESEND_TOKEN` + domínio com SPF/DKIM. **Não marcar o corte como 100% antes disso.** |
| 2 | Credenciais de QA | O `/review` removeu as senhas do handoff (correto). **Não pedi ao usuário** (loop sem interrupção): criei uma conta descartável pela UI. Para reuso entre rodadas, o caminho é `.claude/dev-credentials.local.md` (gitignored). |
| 3 | `testTimeout` ausente nas 9 configs de Vitest | Declarar explícito na `apps/app` (ex.: 15 s). O arquivo é 3–8× mais lento sob contenção; a margem contra o default de 5 s encosta em CI carregado. |
| 4 | `reloadCurrentUser` sem teste em `packages/auth` | Barato (a suíte existe e já mocka `firebase/auth`). Deixei recomendado; cobri o comportamento do lado do consumidor. |
| 5 | D-A (oráculo por tempo) | Manter como resíduo, com o critério de aceite honesto que escrevi. Corrigir em `api-hardening` com `after()` do Next 15. |
| 6 | D-B (`skipValidation` × `extends`) | Confirmado ainda ativo. Abrir item de backlog junto do defeito de §6. |
| 7 | Depoimento com idioma atrasado (§6) | Backlog. Fora do escopo. |

**Dúvida que resolvi sozinho** (não perguntei, como pedido): onde colocar o guarda de contraste. Escolhi
`apps/app/__tests__/` em vez de criar suíte em `packages/design-system` — justificativa completa em §3.1.

---

## 8. Estado de desenvolvimento alterado

| item | estado |
|---|---|
| `apps/api/.env` | **restaurado byte-idêntico** — SHA1 `6f3e0d6c91e734d4fbea9d054571bd97969e49c9` antes e depois. `RESEND_FROM`/`RESEND_TOKEN` receberam placeholder temporário para exercitar a anti-enumeração e voltaram ao original (vazios) |
| `apps/app/.env` | **não tocado** — SHA1 `d82e140acffbd3edc9b6e54d2f4ff3d138d2d912` |
| Conta nova no Firebase de dev | **1 conta descartável** criada pela UI: `qa-test-1789017657@example.com`, `emailVerified: false`, senha definida na criação. Pode ser apagada |
| Contas de QA existentes | **não alteradas.** A deriva registrada no handoff §8.6 segue sendo a de antes |
| Pedidos de reset disparados | ~10 em `qa-common-ci@example.com` (nenhum e-mail saiu: sem remetente real). Nenhuma senha foi redefinida por mim |
| Emulação do browser | `agent-browser set media` devolvido a `light`; sessão fechada (`close --all`) |
| Servidores de dev | `apps/app` :3000 e `apps/api` :3002 subidos por mim, ainda rodando |
| Arquivos temporários | `/tmp/qa-*` e `/tmp/useAlert.*`. **Nada fora de `/tmp`**; nenhum script sobrou no working tree |

---

## 9. Arquivos do working tree tocados por esta etapa

Nada commitado. Para o plano de commits do `/review`:

| arquivo | commit sugerido |
|---|---|
| `apps/api/__tests__/authPasswordReset.test.ts` (+5) | #4 (rotas de reset) |
| `apps/api/__tests__/authEmailVerification.test.ts` (+3) | #5 (rotas de verificação) |
| `apps/app/__tests__/useEmailVerification.test.tsx` (novo) | #10 (aviso de e-mail não confirmado) |
| `apps/app/__tests__/alertTheme.test.ts` (novo) | **#13** (`fix(design-system): make the toast text legible in light mode`) — é o guarda dessa correção e deve viajar com ela, para que derrubar o #13 derrube o teste junto |
| `docs/features/auth-recovery-verification/test/**` | #14 (`docs(features)`) |
