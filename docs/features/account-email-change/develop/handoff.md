# Handoff do develop: troca de e-mail do titular

Implementação do plano `analyze/plan.md`, feita em rodada autônoma do `/cycle`. Nada foi commitado; o
índice continua só com o `git mv` de `specs/accessibility-conformance.md`, que já estava lá antes.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| Contrato no SDK (§3) | `packages/sdk/src/types/account/account.ts` (`ChangeEmailRequest`, `AccountEmailChangeRequested`), `packages/sdk/src/actions/account/action.ts` (`requestEmailChange`), `packages/sdk/src/actions/auth/action.ts` (`EmailChangeConfirmBody`, `confirmEmailChange`), `packages/sdk/src/types/audit/audit.ts` (`ACCOUNT_EMAIL_CHANGE`) |
| Helpers da API (§4.3) | `apps/api/(shared)/lib/auth-action-links.ts` (tipo `change-email`, `toAppLink`, `buildEmailChangeLink`), `apps/api/(shared)/lib/firebase-identity-toolkit.ts` (`identityCheckOobCode`, `ToolkitApplyOob` exportado com `newEmail?`), `apps/api/(shared)/lib/toolkit-error-codes.ts` (`EMAIL_EXISTS` no mapper de código de ação) |
| Validação (§4.2) | `apps/api/(shared)/validation/account.schema.ts` (`changeEmailSchema`, `parseChangeEmail`), `apps/api/(shared)/validation/auth.schema.ts` (`parseEmailChangeConfirm`) |
| Pedido (§4.4) | `apps/api/app/(routes)/account/email/route.ts` |
| Confirmação (§4.5) | `apps/api/app/(routes)/auth/email-change/confirm/route.ts` |
| Rate limit (§4.1) | `apps/api/proxy.ts` (`/auth/email-change/confirm`, `/account/email` e uma frase no comentário da lista) |
| E-mail (§6.3) | `packages/email/templates/email-change-notice.tsx`, `packages/email/templates/previews/email-change-notice.{en,es}.tsx`, `packages/email/preview-data.ts`; o slug `changeEmail` do link veio só do dicionário, sem mexer em `action-link.tsx` |
| Aba Perfil (§5.1) | `apps/app/.../account/(components)/AccountEmailChangeDialog.tsx` (novo, exporta `lacksPasswordProvider`), `.../account/(components)/AccountProfileForm.tsx` (fragmento com o diálogo como irmão do `<form>`), `.../account/(validations)/accountEmailChangeSchema.ts`, `.../account/(hooks)/useAccountMutations.tsx` (`requestEmailChangeMutation`) |
| Página do link (§5.2) | `apps/app/app/[locale]/(unauthenticated)/verify-email/page.tsx` (lê `mode`), `.../verify-email/components/ConfirmEmailChangeResult.tsx`, `apps/app/shared/hooks/useEmailVerification.ts` (`confirmEmailChangeMutation` com `logout()`) |
| i18n (§6) | `translations/apps/app/pages/common/account.ts` (`emailHint` removido, `profile.emailChange.*`, `messages.emailChangeRequested`), `translations/apps/app/pages/emailVerification/index.ts` (`changeEmail.*`), `translations/packages/email/index.ts` (`actionLink.actions.changeEmail`, `emailChangeNotice`), `translations/apps/app/pages/admin/auditTrail.ts` (`account.email.change`), `translations/packages/shared/utils.ts` (3 códigos) |
| Docs (§11.4) | `docs/SECURITY.md`, `docs/PAYMENTS.md` (seção nova "Troca de e-mail do titular"), `docs/PRE-PRODUCTION.md` (§3, §4 e o passo do Customer Portal em §12) |

## Contrato e raio de impacto

Tudo aditivo. `AccountActions.requestEmailChange` só é chamado por `useAccountMutations`;
`AuthActions.confirmEmailChange` só por `useEmailVerification`. O valor novo de `AuditAction` obrigou o
rótulo em `auditTrail.ts` nos 3 idiomas; `AccountDataExportRecord.action` é `string` e não mudou.
`ToolkitApplyOob` passou a ser exportado porque a rota de confirmação tipa a variável com ele.

## Códigos de erro novos

`ACCOUNT_EMAIL_UNCHANGED`, `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` e `AUTH_EMAIL_CHANGE_FAILED`, todos em
`apiErrors` nos 3 idiomas. A paridade passou (`pnpm --filter @repo/internationalization test` → 59/59) e
`apps/app/__tests__/accountApiErrorCopy.test.ts` confere que cada um tem texto próprio nos 3 idiomas, fora
da mensagem genérica.

## Desvios em relação ao plano

1. **Chave `validation.emailMax` a mais.** O plano pedia a regra "até 320 caracteres" no diálogo, mas a
   lista de mensagens da §6.1 não trazia texto para ela. Acrescentei `emailMax` nos 3 idiomas.
2. **Placeholder `newEmail` registrado no teste de copy do e-mail.** `packages/email/__tests__/emailCopy.test.ts`
   mantém uma lista fechada dos placeholders que o `interpolate` resolve, e falhou com o `{newEmail}` do
   aviso. Acrescentei `newEmail` à lista. O template passa o valor, e o teste de preview confere que nenhum
   `{newEmail}` sobra no HTML. É extensão da lista, não afrouxamento: um placeholder com erro de digitação
   continua falhando.
3. **Rota do pedido quebrada em helpers.** A versão do esqueleto passou do limite de complexidade cognitiva
   do Biome (17 contra 15). Extraí `refuseWrongPassword`, `linkFailureResponse` e `emailSendFailed` no
   próprio arquivo da rota. A ordem das checagens é a do plano.
4. **Mutation recebe o corpo sem `locale`.** O tipo do parâmetro é `Omit<ChangeEmailRequest, "locale">`,
   porque o hook sempre injeta o idioma atual e o diálogo não deve escolher outro.
5. **`autoComplete="current-password"`** no campo de senha do diálogo, além do `autoComplete="email"` que o
   plano já pedia no endereço.

Nenhuma decisão do plano me pareceu errada. O modo degradado, a ordem aviso → link e a conferência do tipo
de código antes de aplicar foram implementados como descritos.

## Decisões em aberto e pendências

- `lacksPasswordProvider` duplica `requiresPrivacyChannel` de `AccountPrivacyPanel.tsx`, como o plano já
  previa (§15). Achado para o backlog; não mexi no painel de privacidade.
- Pré-requisitos de infra seguem os da §14 do plano, agora descritos em `docs/PRE-PRODUCTION.md` §3, §4 e
  §12. Nenhum bloqueia a entrega.

## Validação (medida nesta etapa)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 806 arquivos, 0 erro |
| Typecheck e testes | `pnpm turbo run typecheck test --filter=api --filter=app --filter=@repo/email --filter=@repo/internationalization --filter=@repo/sdk` | 16/16 tasks; api 1017/1017 (78 arquivos), app 752/752 (91), email 202/202 (7), internationalization 59/59 (6) |
| Typecheck da web | `pnpm turbo run typecheck --filter=web` | 1/1 task |
| Teste que prova o diálogo fora do `<form>` | movi o `<AccountEmailChangeDialog>` para dentro do `<form>` do perfil e rodei `vitest run __tests__/accountEmailChangeDialog.test.tsx -t "salvar do perfil"` | o teste falhou (o `account.update` foi chamado); restaurei o arquivo e o teste voltou a passar |

### Smoke local contra os emuladores

Subi os emuladores de Auth e Firestore (`firebase emulators:start --only auth,firestore`, JDK 21 do
Homebrew), rodei o seed e subi a API com `RESEND_TOKEN=""` e `RESEND_FROM=""`. As contas usadas foram as do
seed; nenhuma credencial ficou em arquivo. Os três processos foram derrubados pelos PIDs que iniciei e as
portas 3002, 8080, 9099, 4400, 4001 e 9150 ficaram livres (`lsof -ti tcp:<porta>` vazio). O
`firestore-debug.log` que o emulador criou na raiz foi apagado.

| O que foi medido | Instrumento | Resultado |
|------------------|-------------|-----------|
| Modo degradado | `curl -X POST /account/email` com Bearer do `user@example.com` e senha `"x"` (inválida pelo schema) | `503 {"error":{"code":"EMAIL_NOT_CONFIGURED"}}`, o que mostra a checagem antes da leitura do corpo |
| Sem sessão | mesmo `curl` sem `Authorization` | `401 AUTH_INVALID_TOKEN` |
| Confirmação feliz | código gerado com `generateVerifyAndChangeEmailLink("user2@example.com", "qa-account-email-change-novo@example.com")` e `curl -X POST /auth/email-change/confirm` | `200 {"data":{"confirmed":true}}`; depois disso `getUserByEmail` do antigo → `auth/user-not-found` e do novo → encontrado, `emailVerified=true` |
| Revogação | `tokensValidAfterTime` pelo Admin SDK | a conta trocada foi de 14:11:31 (criação) para 14:12:12; uma conta não tocada ficou em 14:11:31 |
| Trilha | consulta na coleção `auditEvent` por `action == "account.email.change"` | 1 documento, `changedFields: ["email"]`, `actorLabel` com o endereço antigo, `targetLabel` com o novo, ator igual ao alvo |
| Link repetido | o mesmo código de novo | `400 AUTH_OOB_CODE_INVALID` |
| Código de verificação na rota de troca | código de `generateEmailVerificationLink` | `400 AUTH_OOB_CODE_INVALID`; o mesmo código depois em `/auth/email-verification/confirm` → `200`, ou seja, a rota de troca não o gastou |
| Código lixo | `oobCode: "garbage"` | `400 AUTH_OOB_CODE_INVALID` |

A `apps/app` não foi aberta no navegador. Tudo o que depende de tela está na lista abaixo.

## A verificar no `/test`

- Toast de `EMAIL_NOT_CONFIGURED` traduzido nos 3 idiomas, com o diálogo aberto. O teste de componente
  prova que `errorAlert` é chamado e o diálogo fica aberto, com o SDK mockado. Repro: app local sem Resend
  → Perfil → Trocar e-mail → preencher → Enviar link.
- Frase "em breve" ausente e botão "Trocar e-mail" visível na aba Perfil real, com a conta do seed.
- Conta só Google mostrando `emailChange.unsupported` na tela real (o teste de componente cobre com
  `providerData` fixo).
- Admin personificando: botão desabilitado na tela e `POST /account/email` forçado respondendo
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` com os headers reais do SDK (medido só no teste da rota).
- Página `/pt-br/verify-email?mode=verifyAndChangeEmail&oobCode=<código>` no navegador: cartão de
  sucesso, link "Entrar", e a sessão aberta noutra aba caindo depois da troca. O `logout()` do cliente
  depois da confirmação só foi testado no hook, com `@repo/auth/client` mockado.
- Mesma página aberta no navegador da sessão antiga: o cartão de sucesso não pode sumir por redirecionamento
  do provider de auth.
- Dois pedidos pendentes: aplicar um e ver o outro falhar com `AUTH_OOB_CODE_INVALID` no emulador. Não
  medi.
- Endereço tomado entre o pedido e o clique: confirmação respondendo `USERS_AUTH_EMAIL_ALREADY_IN_USE`.
  Coberto só no teste da rota, com o toolkit mockado.
- Light, dark e 375 px na aba Perfil com o diálogo aberto e na página de confirmação, nos 3 idiomas.
- Rótulo "E-mail alterado pelo titular" na tela de auditoria do admin (o `typecheck` garante que a chave
  existe nos 3 idiomas; a tela não foi aberta).

## Lacunas de teste conhecidas

- Nenhum teste automatizado roda a confirmação contra o emulador de Auth; a medição acima foi manual e não
  vira evidência. O `test:emulator` não sobe o Auth, e mudar isso é infra fora desta fatia (D13 do plano).
- A entrega real dos dois e-mails pela Resend e o comportamento do Firebase de produção ficam para o ciclo
  real descrito em `docs/PRE-PRODUCTION.md` §3.

## Dados de QA criados

Só no emulador, que foi derrubado: `user2@example.com` do seed passou a ser
`qa-account-email-change-novo@example.com`, e o `user@example.com` teve o e-mail verificado de novo. O seed
reconstrói tudo na próxima execução. Nenhuma conta foi criada fora do emulador.
