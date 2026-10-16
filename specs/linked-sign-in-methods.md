---
id: linked-sign-in-methods
title: Métodos de login vinculados à conta
status: approved
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/auth, packages/sdk, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/auth/client.ts, packages/auth/provider.tsx, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx"]
feature: -
updated: 2026-10-16
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

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
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
  [`social-sign-in-providers`](social-sign-in-providers.md), que depende desta.
- **Reautenticar conta Google para excluir a conta sem criar senha**: é o contrato de "sessão recente" que
  [`account-security-mfa`](account-security-mfa.md) deixou fora do corte. Esta spec dá à conta só Google um caminho
  pelo fluxo de senha que já existe, sem generalizar esse contrato.
- **Mesclar duas contas** quando o Google já pertence a outra conta: a doc do Firebase sugere mesclar e apagar a
  antiga; isso mexe em posse de registros e fica para quando houver caso.
- **Link por e-mail como método vinculado**: entra com [`magic-link-sign-in`](magic-link-sign-in.md).

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
