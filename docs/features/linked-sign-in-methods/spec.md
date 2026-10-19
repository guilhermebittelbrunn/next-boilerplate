---
id: linked-sign-in-methods
title: Métodos de login vinculados à conta
status: done
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/auth, packages/sdk, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/auth/client.ts, packages/auth/provider.tsx, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx"]
feature: linked-sign-in-methods
updated: 2026-10-19
---

# Métodos de login vinculados à conta

## Problema

Quem cria a conta pelo Google fica preso a ele. Não há como definir uma senha, então três fluxos da área de conta
recusam essa pessoa: excluir a conta, trocar o e-mail e trocar a senha. Os dois primeiros mostram um aviso de "não
suportado"; o terceiro mostra o formulário normal e falha ao conferir uma senha que nunca existiu. Excluir a conta
é um direito do titular, e hoje a conta só Google depende do suporte para exercê-lo.

O caminho inverso também falta: quem tem senha não consegue ligar o Google à mesma conta. Se um dia tentar entrar
pelo Google com o mesmo e-mail, o comportamento depende da configuração do projeto Firebase, e o repositório não
trata nenhum dos casos.

## O que já existe no repo

- `apps/api/(shared)/lib/auth-providers.ts:10-14` — `hasPasswordProvider` decide pelo `providerData` se a conta tem
  senha. É a regra que barra a conta só Google.
- `apps/api/app/(routes)/account/deletion/route.ts:48-53` — exclusão responde
  `ACCOUNT_DELETION_REAUTH_UNSUPPORTED` sem provedor de senha. `account/email/route.ts:102-107` faz o mesmo com
  `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED`.
- `apps/api/app/(routes)/account/password/route.ts:29-46` — a troca de senha só barra conta sem e-mail; para a conta
  só Google, tenta conferir a senha atual no Identity Toolkit e devolve o erro de credencial.
- `apps/app/.../account/(components)/AccountSecurityForm.tsx:56-103` — o formulário de troca de senha aparece sem
  olhar o `providerData`. `AccountPrivacyPanel.tsx:41`, `:125-133` e `AccountProfileForm.tsx:115-130` já leem o
  `providerData` para mostrar o aviso de não suportado.
- `apps/api/(shared)/mappers/user.mapper.ts:18-24` — a API devolve o `providerData` em `GET /account`.
- `packages/auth/client.ts:142-155` — o cliente sabe entrar com senha e com Google por popup; não há
  `linkWithCredential`, `linkWithPopup` nem `unlink` no repositório (grep vazio em `apps/` e `packages/`).
- `packages/sdk/src/types/audit/audit.ts:4-12` — a trilha já registra troca de senha e de e-mail da conta.
- **Lacuna:** a conta não mostra nem altera os métodos de login vinculados a ela.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Vincular métodos de login".
- Prevalência: **1 de 10** starters confirmado (Makerkit, desligado por padrão, `NEXT_PUBLIC_AUTH_IDENTITY_LINKING`:
  "link Google to an existing email account"). Os demais não mencionam ou não foram verificados. A prevalência é
  baixa, e esta spec não se apoia nela.
- O argumento é do próprio repositório: três fluxos da conta já existentes recusam quem entrou pelo Google, um deles
  é o direito de eliminação. O Firebase oferece a vinculação de graça (`linkWithPopup`, `linkWithCredential` com
  `EmailAuthProvider.credential`, `unlink`), e o emulador de Auth cobre provedores federados.
- Fontes: <https://firebase.google.com/docs/auth/web/account-linking> (atualizada em 2026-10-14) ·
  <https://makerkit.dev/docs/next-supabase-turbo/configuration/authentication-configuration> ·
  <https://firebase.google.com/docs/emulator-suite/connect_auth> (lidas em 2026-10-16).

## Proposta — corte de MVP

- [ ] A aba Segurança lista os métodos de login da conta (senha, Google), lidos do `providerData` que a API já
      devolve, com texto nos três idiomas.
- [ ] Uma conta só Google define uma senha, depois de confirmar a posse da conta Google. A senha segue a política
      que já vale no cadastro. A partir daí, excluir a conta, trocar o e-mail e trocar a senha funcionam pelo fluxo
      que já existe.
- [ ] Uma conta com senha vincula o Google. Se aquele Google já pertence a outra conta, a tela explica com um
      código de erro traduzido e nada muda.
- [ ] O usuário desvincula um método quando sobra pelo menos outro. O último método nunca sai.
- [ ] O formulário de troca de senha só aparece para quem tem senha; quem não tem vê a opção de definir uma.
- [ ] Vincular, desvincular e definir senha entram na trilha de auditoria, como a troca de senha já entra.

### Fora do corte

- **Outros provedores** (GitHub, Microsoft, Apple): ficam em
  [`social-sign-in-providers`](../../../specs/social-sign-in-providers.md), que depende desta.
- **Reautenticar conta Google para excluir a conta sem criar senha**: é o contrato de "sessão recente" que
  [`account-security-mfa`](../../../specs/account-security-mfa.md) deixou fora do corte. Esta spec dá à conta só Google um caminho
  pelo fluxo de senha que já existe, sem generalizar esse contrato.
- **Mesclar duas contas** quando o Google já pertence a outra conta: a doc do Firebase sugere mesclar e apagar a
  antiga; isso mexe em posse de registros e fica para quando houver caso.
- **Link por e-mail como método vinculado**: entra com [`magic-link-sign-in`](../../../specs/magic-link-sign-in.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Talvez uma ação de conta para definir senha, se o `/analyze` escolher fazer isso no servidor; o tipo de método de login já vem no `providerData`. |
| `apps/api` | Novos eventos de auditoria; se definir senha passar pela API, uma rota no padrão de `/account/password`. |
| `apps/app` | Seção "Métodos de login" na aba Segurança; o formulário de senha passa a depender do método. |
| `apps/web` | N/A. |
| `packages/*` | `auth`: vincular e desvincular no cliente. i18n: textos e `apiErrors` novos nos três idiomas. |
| Infra/env | Nenhuma variável. A configuração "uma conta por e-mail" do projeto Firebase precisa estar escrita no `docs/FORKING.md`, porque muda o comportamento do vínculo. |

## Riscos e trade-offs

- **Definir senha é operação sensível.** Quem tem a sessão aberta numa máquina emprestada não pode ganhar uma senha
  permanente na conta de outra pessoa. O corte exige prova recente de posse do Google. O repositório já registrou
  que entrar pelo cookie de sessão compartilhado regrava o instante de autenticação
  (`account/deletion/route.ts:55-72`), então o `/analyze` não pode confiar na idade da sessão.
- **Desvincular e voltar.** A doc do Firebase avisa: quem desvincula um provedor e entra de novo com ele ganha uma
  conta nova e separada. A tela precisa dizer isso antes de confirmar.
- **Sessões depois da mudança.** Trocar senha hoje revoga todas as sessões (`account/password/route.ts`). Definir
  a primeira senha ou vincular um provedor deve seguir a mesma regra? A resposta muda o que o usuário vê.
- **Conta criada pelo admin** sempre tem senha; o caso só Google vem do cadastro pelo Google.
- Sem custo herdado: o vínculo é gratuito no Firebase e não exige variável nova.

## Sinais de pronto

- Uma conta criada pelo Google no emulador define uma senha, sai, entra com e-mail e senha, e consegue excluir a
  conta pela aba Privacidade.
- Uma conta com senha vincula o Google e entra pelos dois caminhos; a lista mostra os dois métodos.
- Tentar desvincular o único método é recusado, na tela e na API.
- A conta só Google não vê o formulário de troca de senha.
- A trilha de auditoria mostra o vínculo, o desvínculo e a senha definida.

## Decisões

- **D5, 2026-10-16:** definir a primeira senha encerra as outras sessões, como a troca de senha já faz
  (`account/password/route.ts:65-66`). O motivo é o mesmo da troca: a conta ganhou uma credencial nova.

## Perguntas em aberto

- A prova de posse do Google para definir senha é o popup do Google no momento da ação? — **recomendação:** sim,
  conferida no servidor, sem confiar na idade da sessão do app.

## Estado da entrega

Entregue pela PR #48, mergeada em `main` em 2026-10-19 às 13:32 UTC (`44b2b04`), a partir da branch
`feat/linked-sign-in-methods`. A execução de merge do CI (`gh run 39261017799`, SHA `44b2b04`) terminou em `success`
nos quatro jobs: `changes`, `verify` (4 min 25 s), `coverage` e `e2e` (3 min 58 s). O `/test` da feature fechou com
13 ✅, 0 ❌ e 3 🔒; os três 🔒 exigem projeto Firebase real (o popup do Google de verdade, o "User account linking"
do projeto e `auth/unauthorized-domain`), como o plano previa. Arquivada pelo `/spec --sync` de 2026-10-19, que releu
cada item do corte no código de `44b2b04`.

| item do corte | situação | evidência |
|---------------|----------|-----------|
| 1. A aba Segurança lista os métodos de login da conta, lidos do `providerData`, nos três idiomas | **implementado** | `AccountSignInMethodsPanel.tsx:51` lê `account.providerData`, `:85-105` monta uma linha por método (senha e Google sempre, outro provedor com o id cru) e `:113-118` mostra título e descrição; o painel entra na aba em `AccountSecurityForm.tsx:76`; textos em `translations/apps/app/pages/common/account.ts:80`, `:332` e `:585` |
| 2. Conta só Google define uma senha depois de provar a posse do Google, com a política do cadastro; daí em diante os fluxos de senha valem | **implementado** | `apps/api/app/(routes)/account/password/set/route.ts:16-88`: a prova em `:55-59` (`isRecentGoogleSignIn`, `apps/api/(shared)/lib/recent-google-sign-in.ts:13-30`, que exige `sign_in_provider` `google.com` e `auth_time` de até 300 s), a gravação em `:61-71` e a revogação em `:74`; a senha passa por `newPasswordSchema` (`account.schema.ts:58`); no cliente, `reauthenticateWithGoogle` (`packages/auth/client.ts:178`) e `AccountPasswordSetForm.tsx`. Exclusão e troca de e-mail continuam decidindo por `hasPasswordProvider` (`auth-providers.ts:17-19`). O `/test` definiu a senha de uma conta só Google criada pelo popup do emulador, entrou com e-mail e senha e excluiu a conta pela aba Privacidade |
| 3. Conta com senha vincula o Google; Google que já é de outra conta vira código traduzido e nada muda | **implementado** | `linkGoogle` (`packages/auth/client.ts:170`) usa `linkWithPopup`; a API grava o evento só se o provedor já aparece na conta (`account/sign-in-methods/linked/route.ts:37-43`); `auth/credential-already-in-use` traduzido em `translations/packages/auth/index.ts:27`, `:66` e `:108`. O `/test` mediu a mensagem nos três idiomas, com a lista mantendo "Não vinculado" |
| 4. Desvincular quando sobra outro método; o último nunca sai | **implementado** | `account/sign-in-methods/[id]/route.ts:44-49` responde `409 ACCOUNT_SIGN_IN_METHOD_LAST`; a tela desabilita o botão do último método (`AccountSignInMethodsPanel.tsx:122`, `:162-164`) e mostra o motivo (`:150-154`) |
| 5. O formulário de troca de senha só aparece para quem tem senha; quem não tem vê a opção de definir | **implementado** | `AccountSecurityForm.tsx:78-117` escolhe entre `AccountPasswordSetForm` e o formulário de troca por `lacksPasswordProvider` (`apps/app/shared/lib/signInMethods.ts:22-23`) |
| 6. Vincular, desvincular e definir senha entram na trilha | **implementado** | três ações novas em `packages/sdk/src/types/audit/audit.ts:13-15`, gravadas em `password/set/route.ts:76-85`, `linked/route.ts:46-56` e `[id]/route.ts:64-74`; rótulos em `translations/apps/app/pages/admin/auditTrail.ts:22-24` e equivalentes em en e es. O `/test` viu as três em `/admin/audit` |

**Deriva, com a leitura de cada uma:**

- **Desvincular roda no servidor**, pelo Admin SDK (`providersToUnlink`), e não no cliente como a tabela de impacto
  sugeria. A regra "o último método nunca sai" precisa valer na API (regra de ouro 4). A spec estava imprecisa; o
  resultado pedido é o mesmo.
- **Desvincular a senha encerra todas as sessões, inclusive a atual.** O plano dizia que desvincular não revogava.
  O `/develop` mediu no emulador que o Firebase apaga o e-mail e o `emailVerified` da conta ao tirar a senha; a rota
  devolve os dois numa segunda chamada (`[id]/route.ts:80-96`), o Firebase trata essa devolução como troca de e-mail
  e revoga os refresh tokens, e a rota chama `revokeUserSessions` em seguida (`:100`). A tela sai da conta e o aviso
  do diálogo diz isso. A spec não previa o efeito do provedor.
- **Definir a senha encerra todas as sessões, não só "as outras"** como a D5 escrevia. A D5 cita a troca de senha,
  que já encerra todas, e o Firebase não revoga de forma seletiva. A spec estava imprecisa.
- **`packages/auth/provider.tsx` não mudou**, embora estivesse no `contends_on`. Em compensação, a entrega tocou
  cerca de vinte arquivos fora da lista: os outros componentes da aba de conta, `accountFormSchema.ts`, o
  `signInMethods.ts` novo, `account.schema.ts`, `auth-providers.ts`, o enum de auditoria, a ação de conta do SDK,
  quatro dicionários e três documentos.

**Além do corte:** a checagem "tem senha?" da app deixou de existir em duas cópias e passou a morar em
`apps/app/shared/lib/signInMethods.ts`; o `docs/SECURITY.md` ganhou a contagem certa de rotas (40, 26 com guard e 14
sem), que a PR #47 tinha deixado em 36; o `docs/FORKING.md` passou a explicar a escolha de "User account linking" do
projeto Firebase; e o `docs/PRE-PRODUCTION.md` ganhou a declaração do que o vínculo não alcança (o SDK do Firebase
permite vincular fora do produto, sem a API).

**Ficou para o backlog** (achados em `specs/BACKLOG.md`): a conta que fica sem e-mail se a segunda chamada do
desvínculo da senha falhar, dois desvínculos simultâneos que podem tirar o último método, a janela de 300 s sem
tolerância de relógio, o evento de vínculo que pode faltar ou repetir, e a suíte `test:emulator`, que não sobe o
emulador de Auth.
