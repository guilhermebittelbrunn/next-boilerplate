# Relatório de QA: troca de e-mail do titular

Rodada autônoma do `/cycle`, 2026-09-29, sobre o diff não commitado da branch `run-full-task-cycle-v1`
(inválida no padrão; o `/review` propôs `feat/account-email-change`). Não criei branch, não commitei e não
mexi no índice, que continua só com o `git mv` de `specs/accessibility-conformance.md`.

Resultado: **aprovado**, com um item 🔒 que depende de infra externa. A primeira rodada achou um defeito
de acessibilidade (o foco não entrava no diálogo ao abrir); o revisor corrigiu e a segunda rodada remediu
a correção. Suíte verde, fluxo inteiro contra o emulador, 3 idiomas, light, dark e 375 px, axe sem violação.

## Placar

| Status | Quantidade |
|--------|-----------|
| ✅ verificado e correto | 16 |
| ❌ falha | 0 (o foco ao abrir o diálogo falhou na 1ª rodada e passou na 2ª) |
| 🔒 não verificável sem infra externa | 1 (aviso ao endereço antigo; entrega real pela Resend) |

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, `turbo test test:emulator`, JDK 21 de `/opt/homebrew/opt/openjdk@21`), 1ª rodada | 14/14 tasks, 9 do cache; api 1022/1022 (78 arquivos), app 752/752 (91), `@repo/email` 202/202 (7), `@repo/internationalization` 59/59 (6), `api:test:emulator` 170/170 (4); demais pacotes verdes do cache |
| `pnpm --filter app exec vitest run __tests__/accountEmailChangeDialog.test.tsx` | 14/14 depois dos 3 testes novos |
| O mesmo arquivo com `onCloseAutoFocus` retirado do diálogo (mutação temporária, arquivo restaurado e conferido com `cmp`) | 3 falhas, exatamente os 3 testes novos |
| `pnpm test` (raiz), 2ª execução, depois dos testes novos | 14/14 tasks, 12 do cache; app 755/755 (91), api 1022/1022, `api:test:emulator` 170/170 |
| `pnpm --filter app test` (2ª rodada, depois da correção do foco ao abrir) | 756/756 (91 arquivos) |
| `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/sdk --filter=@repo/email --filter=@repo/internationalization` | 5/5 (cache); `--filter=app` remedido depois dos testes novos, 1/1 |
| `pnpm exec biome check apps/app/__tests__/accountEmailChangeDialog.test.tsx` | limpo |

A paridade de i18n (59/59) veio do cache do turbo, porque o pacote não mudou desde o `/review`. O
`@repo/sdk` não tem script de teste; o contrato dele é coberto pelo `typecheck`. O teste conhecido como
instável, `useListAuditEvents.test.tsx`, passou nas duas execuções (10/10 em cada).

Os números do `/develop` e do `/review` batem com os meus: a api foi de 1017 para 1022 com os 5 casos que
o `/review` acrescentou em `authEmailVerification.test.ts`.

### Testes criados

`apps/app/__tests__/accountEmailChangeDialog.test.tsx`, bloco `devolve o foco ao botão que abriu o
diálogo`, com 3 casos: fechar por Esc, por "Cancelar" e depois do pedido aceito. Cada caso foca o botão,
abre o diálogo e confere `document.activeElement` depois de fechar. Sem o `onCloseAutoFocus` do diálogo,
os 3 falham; com ele, passam.

Na 1ª rodada o teste precisou focar o campo à mão, porque o diálogo não movia o foco sozinho ao abrir
(defeito descrito abaixo). Na 2ª rodada o revisor acrescentou o caso "leva o foco ao campo do novo e-mail
quando o diálogo abre" e tirou o foco manual dos 3 casos de retorno, que agora esperam o foco chegar
sozinho. O arquivo tem 15 casos.

### Decisões de custo de teste

| Módulo | Decisão |
|--------|---------|
| `AccountEmailChangeDialog.tsx` (foco) | Teste de componente em jsdom com o Radix real. Barato e prova o comportamento, como as mutações mostraram. |
| `POST /account/email` | Nenhum teste novo. `accountEmailRoute.test.ts` já cobre 19 casos, incluindo cada código da §4.7 do plano, com guard e toolkit mockados. |
| `POST /auth/email-change/confirm` e `/auth/email-verification/confirm` | Nenhum teste novo. `authEmailChangeConfirm.test.ts` e `authEmailVerification.test.ts` (22 casos) cobrem conferência do tipo, revogação e trilha com o toolkit mockado. |
| Confirmação contra o emulador de Auth | Nenhum teste da faixa cara. A medição foi manual, contra o emulador, nesta passada. Automatizar exige subir o Auth no `test:emulator`, o que é mudança de infra fora da fatia (D13 do plano). |
| `ConfirmEmailChangeResult`, `useEmailVerification`, template de e-mail | Nenhum teste novo. `verifyEmailPage.test.tsx`, `useEmailVerification.test.tsx` e os 3 arquivos de `packages/email/__tests__` já cobriam. |

## Critérios de aceite

| # | Critério | Status | Meio | O que foi observado |
|---|----------|--------|------|---------------------|
| 1 | Pedido de troca na aba Perfil | ✅ | e2e + componente + rota | Botão "Trocar e-mail" / "Change email" / "Cambiar correo" visível; texto "em breve" ausente no `innerText` da página. O `200 { requested: true }` e o fechamento no sucesso só são alcançáveis com Resend; foram provados no teste de componente e no de rota. |
| 2 | Nada muda antes do link | ✅ | emulador + rota | Dois links pendentes para `-c@`: o primeiro deu 200, o segundo 400 `AUTH_OOB_CODE_INVALID`, o primeiro repetido 400 `AUTH_OOB_CODE_INVALID`. |
| 3 | Aviso ao endereço antigo | 🔒 | rota + render | Ordem aviso → link e bloqueio do link quando o aviso falha provados em `accountEmailRoute.test.ts`. A entrega real exige Resend com domínio verificado (`docs/PRE-PRODUCTION.md` §3). |
| 4 | Confirmação troca o e-mail e encerra as sessões | ✅ | e2e + Admin SDK | Ver "Evidências", item 4. |
| 5 | Trilha de auditoria | ✅ | e2e + consulta ao Firestore | Um evento por troca confirmada (6 no fim da passada), nenhum para as recusadas. Rótulo nos 3 idiomas. |
| 6 | Senha atual errada | ✅ | rota + schema | No navegador o 503 do modo degradado vem antes da senha, como desenhado; o 400 e o 429 estão em `accountEmailRoute.test.ts`. A mensagem de 6 caracteres apareceu no diálogo. |
| 7 | Endereço já em uso | ✅ | emulador + rota | Endereço tomado depois do link: `400 USERS_AUTH_EMAIL_ALREADY_IN_USE`, conta original intacta. |
| 8 | Endereço igual ao atual | ✅ | e2e + rota | `QA-Account-Email-Change@Example.com` recusado no diálogo com "O novo e-mail é igual ao atual." |
| 9 | Conta sem provedor de senha | ✅ | e2e (pt-br) + componente + rota | Conta só Google: frase `unsupported`, sem botão. en e es cobertos pela paridade do dicionário, não abertos na tela. |
| 10 | Modo degradado sem Resend | ✅ | e2e, 3 idiomas | `POST /account/email` → 503; toast traduzido; diálogo aberto. |
| 11 | Códigos de ação inválidos | ✅ | curl + e2e | Ver "Verificar no `/test`", item 3. |
| 12 | Rota de verificação recusa código de troca | ✅ | e2e + Admin SDK | Ver "Verificar no `/test`", item 6. |
| 13 | Impersonação e perfis | ✅ | e2e + curl + rota | Botão desabilitado; 403 com os headers reais; 401 sem credencial. `COMMON_PANEL_FORBIDDEN` pelo teste da rota. |
| 14 | Duplo clique e cancelamento | ✅ | componente + e2e | Uma requisição por envio no teste; no navegador, cancelar fechou o diálogo. |
| 15 | Foco do teclado no diálogo | ✅ | e2e + componente | 1ª rodada: fechar devolvia o foco, abrir o deixava fora do diálogo. 2ª rodada, depois da correção: ver "Segunda rodada". |
| 16 | Tema, responsivo e idiomas | ✅ | e2e + axe | 0 violação em 21 execuções do axe na 1ª rodada e em 6 na 2ª; sem rolagem horizontal em 375 px. |
| 17 | Stripe documentada | ✅ | leitura + `rg` | `ensureStripeCustomer` existe em `apps/api/(shared)/lib/billing.ts:90`; nenhum `customers.update` em `apps/api` nem em `packages/payments`, então o doc diz a verdade. |

## Defeito de produção

**O foco não entrava no diálogo "Trocar e-mail" ao abrir** (WCAG 2.4.3, ordem do foco).

- Repro: aba Perfil → Tab até "Trocar e-mail" → Enter. `document.activeElement` continuava sendo o botão
  "Trocar e-mail", fora do `[role=alertdialog]`. O Tab a partir dali ia para o input de arquivo,
  "Escolher imagem", "Salvar" e o portal do Next.js antes de chegar a "Novo e-mail"; lá dentro o foco
  ficava preso, como deve.
- Causa: o `AlertDialogContent` do Radix cancela o autofoco de abertura e foca o `cancelRef`
  (`@radix-ui/react-alert-dialog@1.1.23`, `dist/index.mjs:58-60`), que só o `AlertDialogCancel` preenche.
  O rodapé do diálogo é o `Footer` do app, sem `AlertDialogCancel`, então ninguém recebia o foco.
- Onde: `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog.tsx:108`.
- Já existia: o diálogo de exclusão da aba Privacidade tem o mesmo molde (`AccountPrivacyPanel.tsx:137`) e
  mostra o mesmo resultado. A feature copiou o padrão; não o introduziu.

**Corrigido depois da 1ª rodada.** O revisor acrescentou `onOpenAutoFocus` ao `AlertDialogContent` do
diálogo, com `event.preventDefault()` e `form.setFocus("newEmail")`. A correção ficou local porque só 2
`AlertDialogContent` da `apps/app` não têm `AlertDialogCancel` (abaixo do limite de 3 call sites que
justificaria mexer no design system). O diálogo de exclusão da aba Privacidade ficou de fora de propósito:
na 2ª rodada ele continuava sem diff e ainda deixava o foco em "Excluir minha conta" ao abrir. Virou
achado de backlog.

## Segunda rodada

Remedição só do que mudou: `onOpenAutoFocus` no diálogo e o teste de foco.

| Medição | Resultado |
|---------|-----------|
| `pnpm --filter app test` (sem `--force`) | 756/756 em 91 arquivos |
| `vitest run __tests__/accountEmailChangeDialog.test.tsx` | 15/15 |
| O mesmo arquivo sem a linha `onOpenAutoFocus={handleOpenAutoFocus}` (mutação temporária, restaurada e conferida com `cmp`) | 4 falhas: o caso de abertura e os 3 de retorno |

No navegador, contra o emulador, com a conta do seed `user@example.com`, fiz o mesmo roteiro em 6 cortes:
pt-br, en e es, cada um em 1280 e 375 px, alternando light e dark. Tab até o botão ("Trocar e-mail",
"Change email", "Cambiar correo") e Enter. Nos 6, o foco foi para `input[name=newEmail]` dentro de
`[role=alertdialog]` e o Tab seguinte, para `input[name=currentPassword]`. Esc e "Cancelar" devolveram o
foco ao botão; ao reabrir, o foco voltou ao campo "Novo e-mail". Preenchido e enviado pelo teclado, o
pedido deu 503 nas 6 vezes, com o toast de `EMAIL_NOT_CONFIGURED` no idioma da página e o diálogo aberto
com o endereço digitado. O axe (WCAG 2.0/2.1 A e AA) deu 0 violação com o diálogo aberto nos 6 cortes.

Ambiente: portas livres no início; subi emuladores, API e app com o mesmo `buildStackEnv` da 1ª rodada e
derrubei só os PIDs que abri. As 11 portas terminaram vazias. Nenhuma conta foi criada nesta rodada.

## Verificar no `/test`

| # | Item do `review.md` | Veredito | Medição |
|---|---------------------|----------|---------|
| 1 | Suíte da `apps/app` depois da correção de foco | confirmado | 752/752 antes dos testes novos, 755/755 depois, 756/756 na 2ª rodada. |
| 2 | Foco volta ao botão ao fechar (Esc, Cancelar, sucesso) | confirmado | Esc e "Cancelar" devolveram o foco a "Trocar e-mail" nas duas rodadas, em 3 idiomas e 2 larguras. O sucesso não é alcançável sem Resend e foi provado pelo teste de componente. Na 2ª rodada o foco também entra sozinho no campo "Novo e-mail" ao abrir, então os testes de retorno não precisam mais focar o campo à mão. |
| 3 | A conferência do tipo não gasta o código | confirmado | Código de `generateEmailVerificationLink` em `/auth/email-change/confirm` → `400 AUTH_OOB_CODE_INVALID`; depois em `/auth/email-verification/confirm` → 200 e `emailVerified=true`. Código de `generatePasswordResetLink` recusado com 400 pelas duas rotas e ainda válido depois (`accounts:resetPassword` só com `oobCode` devolveu `requestType: PASSWORD_RESET`). `"garbage"` → 400 `AUTH_OOB_CODE_INVALID`; `{}` → 400 `VALIDATION_FAILED`. |
| 4 | Confirmação feliz | confirmado | Ver "Evidências", item 4. |
| 5 | Página no navegador da sessão antiga | confirmado | Link aberto numa aba nova do mesmo navegador logado: cartão "E-mail alterado" ainda na tela 7,5 s depois, URL inalterada. Uma única chamada `POST /auth/email-change/confirm` (200). |
| 6 | Código de troca recusado pela rota de verificação | confirmado | Link de `-b@` aberto sem `mode`: `POST /auth/email-verification/confirm` 400, cartão "Não foi possível confirmar", `getUserByEmail` de `-b@` ainda encontra a conta. O mesmo código com `mode=verifyAndChangeEmail`: "E-mail alterado", `-b-novo@` com `emailVerified=true`, `-b@` sem conta. Verificação comum no navegador (`-d-novo@`): 200 e "E-mail confirmado". |
| 7 | Dois pedidos pendentes | confirmado | Segundo link → `400 AUTH_OOB_CODE_INVALID`; `-c-novo2@` sem conta. |
| 8 | Endereço tomado entre o pedido e o clique | confirmado | Link `-d@` → `-d-novo@`, depois `POST /auth/sign-up` com `-d-novo@` (201); confirmação → `400 USERS_AUTH_EMAIL_ALREADY_IN_USE`; `-d@` intacto. |
| 9 | Modo degradado na tela | confirmado | Toast "O envio de e-mails não está configurado. Fale com o suporte.", "Email delivery is not configured. Contact support." e "El envío de correos no está configurado. Contacta al soporte.", cada um seguido do código de erro da requisição; diálogo aberto com os valores preenchidos. |
| 10 | Aba Perfil (frase ausente, conta Google) | confirmado | Frase "em breve" ausente; conta só Google com "Esta conta entra pelo Google e não tem senha para confirmar a troca de e-mail." e nenhum botão "Trocar e-mail". |
| 11 | Personificação | confirmado | Admin personificando `user2@example.com`: botão com `disabled=true`. Os 7 headers que o SDK mandou no `GET /account` (Bearer, `x-user-id`, `x-user-role=admin`, `x-request-user-id`, `x-request-role=common`, `x-role`, `x-user-timezone`), reenviados no `POST /account/email`: `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. O `GET /account` com os mesmos headers: 200. |
| 12 | Tema, largura e idioma, axe | confirmado | Ver "Evidências", item 12, e "Segunda rodada". |
| 13 | Trilha do admin | confirmado | "E-mail alterado pelo titular", "Email changed by the account holder", "Correo cambiado por el titular", com autor e alvo nos endereços antigo e novo e "email" em campos alterados. |

## Evidências e2e

O que prova é o texto abaixo. Os prints em `test/e2e/` servem de apoio, e o `.gitignore` os descarta.
Nenhum mostra dado de pessoa real: só contas do seed e `qa-account-email-change-*@example.com`.

4. **Confirmação feliz** (`qa-account-email-change@` → `qa-account-email-change-novo@`, pt-br, dark,
   1280 px): cartão com título "E-mail alterado", texto "Entre de novo usando o novo endereço. As sessões
   abertas desta conta foram encerradas." e link "Entrar" para `/pt-br/sign-in`. Pelo Admin SDK, o
   endereço antigo deu `auth/user-not-found`, o novo `emailVerified=true`, e `tokensValidAfterTime` foi de
   14:32:55 para 14:38:09 GMT. Login REST com o antigo: `EMAIL_NOT_FOUND`; com o novo: token emitido.
   Numa sessão isolada aberta antes da troca (outro perfil de navegador), `/pt-br/account` redirecionou
   para `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`. A aba antiga do mesmo navegador fez o mesmo ao
   navegar. Depois de entrar com o endereço novo, o campo E-mail do Perfil mostrou
   `qa-account-email-change-novo@example.com` e o aviso "Confirme seu e-mail" sumiu. O mesmo link, aberto
   de novo, mostrou "Não foi possível trocar o e-mail". Sem `oobCode`, "Link inválido".
5. **Evento na trilha**, lido do Firestore: `actorLabel` com o endereço antigo, `targetLabel` com o novo,
   `changedFields: ["email"]`, `actorUserId` igual a `targetUserId`, `actorUid` igual ao uid do Auth.
9. **Validação do diálogo**, 3 idiomas: vazio mostrou "Informe o novo e-mail." e "Informe a senha."
   ("Enter the new email.", "Enter the password."; "Indica el nuevo correo.", "Indica la contraseña.").
   `nao-e-email` com senha `123` mostrou "Informe um e-mail válido." e "A senha deve ter ao menos 6
   caracteres." Placeholders: `voce@exemplo.com`, `you@example.com`, `tu@ejemplo.com`.
12. **Tema, largura e idioma.** Aba Perfil com o diálogo aberto em 6 cortes: pt-br light e dark a 1280 e
    375 px, en light 1280 e dark 375, es dark 1280 e light 375. Página de confirmação nos 3 estados
    (sucesso, erro, sem código), cada idioma num corte diferente de tema e largura, 9 telas. O axe (tags
    `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, axe-core 4.13.0 injetado na página) deu 0 violação nas
    6 páginas de Perfil, nos 6 diálogos e nas 9 páginas de confirmação. `scrollWidth` nunca passou de
    `innerWidth`. Em 375 px o diálogo mede 343 px, com 16 px de margem de cada lado; em 1280 px, 512 px.
    Títulos: "Trocar o e-mail da conta", "Change the account email", "Cambiar el correo de la cuenta".
    Cartões de sucesso: "E-mail alterado", "Email changed", "Correo cambiado".

Tudo rodou em `next dev`. Nada do que observei parece artefato de desenvolvimento, então não repeti em
`build && start`. Uma vez o toast do 503 não apareceu depois de um clique disparado por `eval` 1,5 s após
abrir a página. Repeti três vezes, com clique real e com `eval`, e ele apareceu em todas. Não trato como
defeito.

## Achado fora do escopo

O `lang` do `<html>` fica uma navegação atrasado ao trocar de idioma pela URL: `/en/verify-email` aberto
logo depois de `/es/account` saiu com `lang="es"`, e `/pt-br/...` depois de `/es/...` também. A segunda
carga no mesmo idioma já sai certa. O proxy grava o cookie `x-locale` na resposta
(`apps/app/proxy.ts:181`) e o layout lê o cookie da requisição (`apps/app/app/layout.tsx:73`). Nada disso
está no diff. Vai como achado para o backlog: fere WCAG 3.1.1 na primeira página depois da troca de idioma.

## Lacunas

| Lacuna herdada | Veredito |
|----------------|----------|
| Retorno do foco ao fechar sem teste (`review.md`) | fechada aqui, 3 testes novos |
| Rota de verificação aceitando código de troca (`review.md`) | já fechada no `/review`; confirmada no navegador |
| Confirmação contra o emulador de Auth sem teste automatizado (`handoff.md`, `review.md`) | continua aberta, fora de escopo: exige o Auth no `test:emulator` (D13). Medida à mão nesta passada. |
| Entrega real dos dois e-mails e Firebase de produção (`handoff.md`, `review.md`) | fora de escopo, 🔒; pendência em `docs/PRE-PRODUCTION.md` §3 |
| Toast, frase ausente, conta Google, personificação, sessão caindo, links concorrentes, endereço tomado, tema e idiomas, trilha (lista "A verificar" do `handoff.md`) | fechadas aqui, todas medidas (tabela acima) |

A lacuna aberta na 1ª rodada (nenhum teste provava o foco ao abrir) foi fechada na 2ª pelo caso de
abertura. O mesmo defeito continua no diálogo de exclusão da Privacidade, fora desta fatia, como achado
de backlog.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150).
Subi, guardando os PIDs:

- emuladores (`pnpm emulators`, Auth, Firestore e Storage, projeto `demo-next-boilerplate`) e o seed;
- API (`next dev -p 3002`) e app (`next dev -p 3000`), com o ambiente montado pelo mesmo `buildStackEnv`
  da suíte Playwright (`apps/e2e/support/stackEnv.ts`): bloco do emulador forçado, chaves reais
  esvaziadas, `RESEND_TOKEN` e `RESEND_FROM` vazios. O `.env` local, que aponta para um projeto Firebase
  real, não chegou aos processos.

Não reutilizei nada do usuário e não subi `web` nem `email`. No fim matei os PIDs guardados. Os
`next-server` e o `firebase-tools` filhos continuaram presos às portas, e os matei pelo PID de cada um.
Conferi as 11 portas acima com `lsof -ti tcp:<porta>`: todas vazias, nas duas rodadas. O `pnpm test` da
raiz sobe e derruba os próprios emuladores, e as portas deles também ficaram livres. O `firestore-debug.log`
em `apps/api/` é ignorado pelo `.gitignore`. Os scripts auxiliares (gerar links pelo Admin SDK, injetar o
axe, roteiros do navegador) ficaram em `/tmp` e foram apagados.

## Dados de QA

Tudo no emulador, que foi derrubado. Nada existe fora dele e nenhuma conta foi criada em projeto real, por
isso nada entra no `docs/PRE-PRODUCTION.md`. As senhas de QA foram geradas na hora, ficaram só em `/tmp`
durante a passada e foram apagadas; nenhuma está em arquivo do repositório.

- Contas criadas, todas em `@example.com`: `qa-account-email-change@` (virou `-novo@`), `-b@` (virou
  `-b-novo@`), `-c@` (virou `-c-novo1@`), `-d@` (virou `-d2@`, `-d3@` e por fim `-d4@`), `-d-novo@`
  (criada para tomar o endereço) e `-google@` (só Google).
- Contas do seed usadas: `admin@example.com`, para a auditoria e para personificar `user2@example.com`, e
  `user@example.com` na 2ª rodada. Nenhuma conta do seed mudou de e-mail.
- 6 eventos `account.email.change` na trilha do emulador.

## Estado de dev alterado

Nenhum. O working tree ganhou só o bloco de testes em `apps/app/__tests__/accountEmailChangeDialog.test.tsx`
e os artefatos desta etapa. O índice ficou como estava.
