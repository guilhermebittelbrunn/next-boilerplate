# Critérios de aceite — `account-settings`

Formato da §9.1 do `docs/feature-analysis-guide.md`: título em negrito + parágrafo explicativo. O veredito
de cada critério (✅ aprovado / ❌ reprovado / 🔒 não verificável) está marcado no próprio título e na
linha `→` logo abaixo, com o meio de verificação; a evidência completa está na §5 do `test/report.md`.

**Placar após a rodada 2: 33 ✅ · 1 ❌ · 4 🔒.** O **D-1** da rodada 1 (flash do tema) foi **corrigido e
revalidado**. Ficam dois defeitos de produção abertos, descritos na §4 do relatório: **D-3** (com
`?redirect=` nenhuma preferência é projetada — reprova o **D4**) e **D-4** (o campo Idioma não recarrega o
valor salvo e bloqueia o save com erro não traduzido).

---

## A. Navegação e estrutura

**✅ A1 — A área de conta existe e é alcançável pelos dois caminhos.**
Em `/{locale}/account`, a página carrega com as 4 abas (Perfil, Segurança, Preferências, Cobrança). O item
"Minha conta" do menu do avatar e o item de Configurações da sidebar levam para a mesma rota, no locale
ativo. Um usuário que nunca ouviu falar da URL chega lá só clicando.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

**✅ A2 — Nenhum item de navegação da área comum aponta para `#`.**
Inspecionando o DOM da sidebar e do dropdown do perfil, nenhum `<a>` tem `href="#"`. O item de Cobrança
aponta para `/{locale}/account?tab=billing`, que renderiza um estado vazio traduzido ("em breve"), não um
link morto. Os grupos "Documentation" e "Limits" foram removidos, não escondidos.
→ **✅** — verificado por: e2e + unit (detalhe em `test/report.md` §5).

**✅ A3 — Deep link por aba funciona em carga fria.**
Abrir diretamente `/{locale}/account?tab=security` (ou `profile`, `preferences`, `billing`) seleciona a aba
correspondente já na primeira pintura (`aria-selected="true"`). Trocar de aba sincroniza a URL. Um valor de
`?tab=` desconhecido cai na aba padrão em vez de renderizar em branco.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

**✅ A4 — A troca de aba não empilha histórico (custo aceito, não é defeito).**
Como a aba é sincronizada por `history.replaceState`, o botão "voltar" do navegador sai da página em vez de
voltar para a aba anterior. É o preço registrado para não pagar um round-trip de RSC por clique. O critério
é que isso **seja verdade e esteja documentado**, não que o back troque a aba.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

---

## B. Perfil

**✅ B1 — Nome de exibição e telefone são editáveis e persistem.**
Salvar o formulário de Perfil grava `displayName` no Firebase Auth e `phone` no documento Firestore do
usuário. Recarregar a página traz os valores salvos. O telefone é gravado com espaços laterais removidos, e
enviar telefone vazio limpa o campo (grava `null`) em vez de gravar string vazia.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

**✅ B2 — O cabeçalho e o menu do avatar refletem o novo nome sem recarregar.**
Depois do salvamento bem-sucedido, o nome exibido no dropdown do perfil muda na mesma navegação, porque a
query da conta é invalidada. Enquanto a conta ainda não carregou, o nome do usuário do Firebase é o
fallback — nunca um espaço em branco.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

**✅ B3 — A validação do formulário recusa o inválido antes de chamar a API.**
Nome vazio, nome acima de 120 caracteres, telefone com letras e avatar com URL não-imagem exibem a mensagem
traduzida do campo e não disparam requisição.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

**✅ B4 — O e-mail é exibido, mas não é editável.**
O campo de e-mail aparece desabilitado, com o aviso traduzido de que a troca virá depois. Nenhuma alteração
de e-mail é aceita pela API (`email` não faz parte do schema de `PUT /account`).
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

---

## C. Senha e sessões

**✅ C1 — A troca de senha exige a senha atual.**
O formulário só submete com senha atual, nova e confirmação. A API reverifica a senha atual no Identity
Toolkit antes de gravar: uma sessão roubada não assume a conta com um clique.
→ **✅** — verificado por: e2e + código (detalhe em `test/report.md` §5).

**✅ C2 — Senha atual errada devolve mensagem traduzida, nunca stack trace.**
A API responde **400 `ACCOUNT_CURRENT_PASSWORD_INVALID`** e a tela mostra a frase do dicionário no idioma
ativo. Nenhum trecho de erro interno, HTML de erro do Next ou nome de função aparece como copy.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

**✅ C3 — Excesso de tentativas é tratado como espera, não como falha inesperada.**
Quando o Identity Toolkit barra por volume, a API responde **429 `USERS_AUTH_RATE_LIMITED`** e a tela pede
para aguardar. O código de cadastro (`USERS_AUTH_SIGN_UP_FAILED`) nunca aparece num fluxo de troca de senha.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ C4 — Conta sem senha recusa a troca com código próprio.**
Uma conta que entrou só por provedor federado (sem e-mail/senha) recebe **400
`ACCOUNT_PASSWORD_UNSUPPORTED`** com a instrução traduzida de entrar pelo provedor original — não um erro
genérico.
→ **✅** — verificado por: unit (detalhe em `test/report.md` §5).

**✅ C5 — 🔴 A troca de senha encerra as demais sessões, nos dois transportes.**
Este é o objetivo #3 do corte de MVP e o item de maior risco da entrega. Com duas sessões reais e
independentes da mesma conta: depois da troca, a **outra** sessão recebe **401** tanto apresentando
`Authorization: Bearer <idToken>` quanto apresentando o session cookie `access-token`. Não basta o cookie
morrer — o ID token, que é como o `apps/app` autentica a API, também tem de parar de valer imediatamente,
e não em até uma hora.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

**✅ C6 — A revogação não faz dano colateral em outra conta.**
Uma conta B, não envolvida na troca, continua respondendo **200** nas mesmas rotas, com a mesma credencial
de antes. A revogação é do sujeito, não global.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ C7 — Login novo depois da troca continua funcionando.**
Entrar de novo com a senha nova produz uma sessão válida: `GET /account` responde **200** por bearer **e**
por session cookie recém-emitido. Uma revogação mal calibrada quebraria justamente o login seguinte, e esse
falso positivo de segurança só apareceria em produção.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

**✅ C8 — "Sair de todos os dispositivos" encerra de verdade, e só após confirmação.**
O botão abre um `AlertDialog`. Cancelar fecha sem disparar requisição. Confirmar chama
`POST /account/sessions/revoke`, encerra as outras sessões nos dois transportes e desloga o navegador
atual. O botão de confirmar precisa **de fato confirmar** — o `asChild` do Radix não pode engolir o
`onClick`, e não pode existir `<button>` dentro de `<button>` no diálogo.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

---

## D. Preferências

**✅ D1 — Tema e idioma são salvos na conta.**
Salvar Preferências grava `{theme, locale}` no documento do usuário. Um `PUT` que manda só metade do mapa
preserva a outra metade (merge, não substituição) e não zera `phone` nem `displayName`.
→ **✅** — revalidado na rodada 2 em navegador virgem: sem `?redirect=`, entra em `/es` claro, sem flash
(classe do servidor == classe do DOM). Override local do toggle do cabeçalho é respeitado no próximo
login, conforme o contrato declarado. ⚠️ Na tela de Preferências o campo Idioma vem vazio (**D-4**).

**✅ D2 — A preferência acompanha a conta em outro navegador.**
Em um perfil de navegador limpo, o sign-in projeta as preferências salvas nos cookies `x-theme` e
`x-locale` e leva o usuário ao idioma preferido. O tema correto está aplicado já na primeira pintura
(`documentElement.className`), sem flash do tema anterior.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

**✅ D3 — Valor de preferência fora do enum é descartado, não propagado.**
Um `theme`/`locale` desconhecido é recusado pela API (`VALIDATION_FAILED`) e, se vier de um documento
legado, não é projetado em cookie — o app cai no default em vez de gravar lixo.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**❌ D4 — `?redirect=` continua tendo precedência sobre o idioma preferido.**
Quando o sign-in recebe `?redirect=`, o destino pedido vence a projeção de locale, e o sanitizador de
open-redirect segue recusando destino externo. A projeção de preferências não pode abrir essa brecha.
→ **❌** — a precedência de navegação funciona, mas com `?redirect=` **nenhuma preferência é projetada**
(nem tema, nem idioma): navegador virgem entra em `pt-br` + tema do SO, com a conta em `es` + `light`.
Repro lado a lado em `test/report.md` §4 (**D-3**).

**✅ D5 — Sessão longa não vê a preferência mudada em outro dispositivo até o próximo sign-in.**
Limitação aceita e documentada (um cookie não pode ser escrito durante o render de um Server Component). O
critério é que o comportamento seja esse, e não um estado intermediário inconsistente.
→ **✅** — verificado por: e2e + código (detalhe em `test/report.md` §5).

---

## E. Avatar

**🔒 E1 — Caminho feliz do upload (pré-requisito de infra).**
Com o Cloud Storage ativo, enviar um JPG/PNG/WebP de até 4 MB grava o objeto sob o prefixo do próprio dono
e a foto aparece no cabeçalho. **O Cloud Storage está desativado em `next-boilerplate-576d0`**, então este
critério não é verificável nesta máquina — não é aprovado nem reprovado.
→ **🔒** — verificado por: Cloud Storage desativado no projeto Firebase (detalhe em `test/report.md` §5).

**✅ E2 — Modo degradado do upload é requisito de produto, e esse é cobrado.**
Com o storage desligado: o app sobe, `pnpm build` passa, a aba de Perfil continua funcional (nome, telefone
e as outras abas intactos) e `POST /files` responde **503** com `error.code` traduzido no campo — **nunca
500, nunca stack trace**. Com a env de bucket vazia, o campo de upload sequer é renderizado.
→ **✅** — verificado por: e2e + api (detalhe em `test/report.md` §5).

**✅ E3 — Avatar não assinável degrada para as iniciais.**
Um avatar já gravado que não pode ser assinado devolve `avatarUrl: null` e a UI cai no `AvatarFallback` com
as iniciais. A leitura da conta nunca falha por causa da imagem.
→ **✅** — verificado por: unit + código (detalhe em `test/report.md` §5).

**✅ E4 — Referência de avatar de terceiro é recusada (fail-closed).**
Apontar o avatar para um objeto sob o prefixo de outro usuário, ou para um `javascript:` URL, responde
**400 `ACCOUNT_AVATAR_INVALID`** e nada é gravado.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**🔒 E5 — O objeto substituído é apagado, e só depois da escrita.**
Trocar ou limpar o avatar apaga o objeto anterior **depois** de a escrita no Firestore ter dado certo. Se a
escrita falha, o objeto antigo continua lá — ele ainda é o válido. Reenviar a mesma referência, ou um `PUT`
que não toca no avatar, não apaga nada.
→ **🔒** — verificado por: bucket inativo; ordem coberta por teste de rota (detalhe em `test/report.md` §5).

---

## F. Autorização e posse (IDOR)

**✅ F1 — 🔴 Cada usuário só altera a si mesmo.**
As rotas de `account` são as primeiras rotas de escrita de usuário não-admin do repo. Nenhuma delas recebe
id de usuário: a chave é derivada do token pelo guard. Com duas contas reais, toda tentativa de A escrever
em B falha — `id`, `uid`, `reference_id` ou `type` no corpo viram **400 `VALIDATION_FAILED`** (`.strict()`),
não escrita silenciosa; `x-user-id` de B vira **403**; e, depois da bateria, o documento de B permanece
intacto.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ F2 — Não autenticado é recusado antes de qualquer leitura.**
Sem credencial, `GET`/`PUT /account`, `POST /account/password` e `POST /account/sessions/revoke` respondem
**401 `AUTH_INVALID_TOKEN`**, sem tocar no Firestore.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ F3 — Credencial válida sem perfil de painel comum é recusada.**
Quem apresenta token válido mas não tem perfil comum recebe **403 `COMMON_PANEL_FORBIDDEN`**.
→ **✅** — verificado por: unit (detalhe em `test/report.md` §5).

**✅ / 🔒 F4 — Admin personificando não escreve nada.**
Sob impersonação, `PUT /account`, a troca de senha e o encerramento de sessões respondem **403** e a UI
desabilita os botões com o aviso de somente leitura. Nem a senha do personificado é trocada, nem as sessões
dele são encerradas.
→ **✅ / 🔒** — verificado por: rota por unit; parte visual sem conta admin de QA (detalhe em `test/report.md` §5).

**✅ F5 — Escalonamento de privilégio é impossível por esta porta.**
`type` (`admin`/`common`) não está no schema de `PUT /account` — continua exclusivo de `PUT /users/[id]`
sob `requireAdminApi`. Um documento Firestore não consegue forjar `uid`, `email`, `emailVerified`,
`disabled` nem `customClaims` no payload devolvido: a lista fechada do lado Auth vence.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ F6 — Corpo vazio não é tratado como sucesso.**
`{}` e `{"preferences":{}}` respondem **400 `ACCOUNT_NOTHING_TO_UPDATE`** em vez de um 200 que não fez
nada.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

---

## G. Dados e contrato

**✅ G1 — Campos do Firestore não são sombreados pelo Firebase Auth.**
No payload de `GET`/`PUT /account`, `phone`, `avatar` e `preferences` (Firestore) convivem com
`phoneNumber` e `photoURL` (Auth) sem colisão. `displayName` do Auth vence uma cópia velha no documento.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

**✅ G2 — Nenhum `Timestamp` cru chega ao cliente.**
Datas saem como string ISO; nenhum objeto `{_seconds, _nanoseconds}` atravessa a borda.
→ **✅** — verificado por: api (detalhe em `test/report.md` §5).

---

## H. i18n, tema e responsivo

**✅ H1 — Todo texto novo existe nos 3 idiomas.**
`pt-br`, `en` e `es` têm exatamente as mesmas chaves (incluindo os `apiErrors` novos). Nenhuma string de UI
— label, placeholder, `aria-label`, toast, título de aba, confirmação — está solta em JSX.
→ **✅** — verificado por: unit + e2e (detalhe em `test/report.md` §5).

**✅ H2 — Cada `error.code` novo tem copy traduzida nos 3 idiomas.**
`ACCOUNT_NOTHING_TO_UPDATE`, `ACCOUNT_AVATAR_INVALID`, `ACCOUNT_CURRENT_PASSWORD_INVALID`,
`ACCOUNT_PASSWORD_UNSUPPORTED`, `ACCOUNT_UPDATE_FAILED` e `ACCOUNT_SESSIONS_REVOKE_FAILED` resolvem para
frase própria, nunca para a mensagem genérica nem para o código cru.
→ **✅** — verificado por: unit + api (detalhe em `test/report.md` §5).

**✅ H3 — As 4 abas funcionam em claro e escuro, em desktop e em 390 px.**
Sem sobreposição, sem texto ilegível, sem componente que ignore o tema.
→ **✅** — verificado por: e2e (detalhe em `test/report.md` §5).

---

## I. Gates

**✅ I1 — O pipeline do CI passa sem cache.**
`pnpm turbo run lint typecheck test --force` termina verde, e `pnpm test` na raiz também — é ele que gateia
o `turbo build`. `pnpm check` não acusa nada. Nenhum teste foi desativado, pulado ou afrouxado para chegar
lá.
→ **✅** — verificado por: gate (detalhe em `test/report.md` §5).

**✅ I2 — A correção de segurança tem teste de regressão.**
A recusa de ID token emitido antes da revogação (`getCurrentUser`) é coberta por teste automatizado que
**falha** se a checagem for removida. Sem isso, a regressão volta em silêncio na próxima refatoração de
`@repo/auth`.
→ **✅** — verificado por: teste de mutação (detalhe em `test/report.md` §5).
