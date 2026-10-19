---
id: contact-support-channel
title: Canal de contato e suporte que entrega a mensagem
status: approved
value: médio
effort: P
audience: produto
area: [apps/web, apps/api, apps/app, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: ["apps/web/app/[locale]/contact/components/contact-form-client.tsx", apps/api/proxy.ts, apps/app/shared/components/ui/ProfileDropdown.tsx, packages/sdk/src/client/index.ts]
feature: -
updated: 2026-10-16
---

# Canal de contato e suporte que entrega a mensagem

> **Reabertura.** A tabela "Lacunas avaliadas e não especificadas" do [`BACKLOG.md`](BACKLOG.md) tinha a linha
> "Consertar o formulário de contato da landing", com o motivo "Não é spec, é achado. É o fallback do canal de
> privacidade." O achado ficou aberto desde 2026-09-26 sem virar tarefa direta. O que mudou: (1) a prevalência foi
> medida pela primeira vez, 2 de 4 starters verificados entregam a mensagem; (2) apareceram dois consumidores
> concretos no core além da privacidade, o plano "Enterprise" da página de preços, que manda para `/contact`, e a
> app, que não tem nenhum caminho de ajuda; (3) o envio pronto que existe no código manda a mensagem para o
> endereço remetente, não para o suporte. Corrigir isso deixou de caber num achado de um arquivo.

## Problema

Quem visita a landing e quer falar com a empresa encontra um formulário que não faz nada: pede data, nome,
sobrenome e um currículo, e o botão não envia. O mesmo formulário é o destino de três caminhos do produto: o canal
de privacidade quando o fork não define um e-mail próprio, o plano "Enterprise" da página de preços e, por falta de
outro, qualquer pedido de ajuda. O usuário logado na app não tem nem esse caminho: o menu do perfil oferece conta,
cookies e sair.

Para o fork, isso significa perder o primeiro contato de um cliente interessado sem saber que perdeu.

## O que já existe no repo

- `apps/web/app/[locale]/contact/components/contact-form-client.tsx:65-111` — campos de data, nome, sobrenome e
  arquivo; nenhum `<form>`, e o `Button` não tem `onClick`.
- `apps/web/app/[locale]/contact/actions/contact.tsx:7-25` — uma server action que envia o template `contact` com
  `replyTo` do visitante. Nenhum arquivo a importa.
- `packages/email/index.ts:82` — `ownerInbox()` devolve `RESEND_FROM`, o endereço remetente. A action acima
  mandaria a mensagem para o próprio remetente.
- `packages/next-config/brand.ts:57` — `supportEmail` vem de `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, hoje usado só no
  rodapé dos e-mails.
- `packages/email/templates/contact.tsx` — o template existe, com texto nos três idiomas
  (`translations/packages/email/index.ts`, seção `contact`).
- `apps/web/shared/lib/privacyContact.ts:5-8`, `:14-18` — sem `NEXT_PUBLIC_PRIVACY_CONTACT`, o canal de privacidade
  cai em `/contact`; o comentário afirma que o formulário "already delivers to the owner inbox", o que o código
  desmente.
- `apps/web/app/[locale]/pricing/page.tsx:73-76` e `components/contact-plan-card.tsx` — o card fixo "Enterprise" leva a
  `/contact`. *(Âncora remedida em 2026-10-16: a PR #47 trocou a página pela leitura do catálogo e manteve o card;
  era `page.tsx:176`.)*
- `apps/app/shared/components/ui/ProfileDropdown.tsx:61-85` — o menu do perfil tem "Minha conta", "Cookies" e
  "Sair".
- `apps/api/proxy.ts:49-62` — a lista de rotas com rate limit, onde uma rota pública nova precisa entrar. *(Era
  `:45-58`; a PR #47 acrescentou quatro linhas ao comentário acima da lista.)*
- **Lacuna:** nenhum caminho do produto entrega uma mensagem do visitante ou do usuário a quem opera o fork.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Formulário de contato que entrega".
- Prevalência: **2 de 4** verificados entregam (Supastarter, "Contact form"; Makerkit, `CONTACT_EMAIL`, "The email
  address for contact inquiries"). O next-forge tem a mesma fachada que este repositório herdou; o ShipFast oferece
  só um link de e-mail. Seis do painel não foram verificados.
- Fontes: <https://supastarter.dev/> · <https://makerkit.dev/docs/next-supabase-turbo/configuration/environment-variables> ·
  <https://github.com/vercel/next-forge/tree/main/apps/web/app/%5Blocale%5D> (lidas em 2026-10-16).

## Proposta — corte de MVP

- [ ] O formulário de `/contact` pede nome, e-mail e mensagem, valida nos três idiomas e entrega a mensagem na caixa
      de suporte do fork, com o e-mail do visitante como resposta. O visitante vê confirmação ou erro traduzidos.
- [ ] A entrega passa pela API, com validação na borda, rate limit e um código de erro por situação. A proteção não
      depende do bloqueio de bot da landing, que está desligado (E13).
- [ ] Sem e-mail configurado, ou sem caixa de suporte definida, o formulário diz que o canal está indisponível e não
      finge ter enviado.
- [ ] Na app, o menu do perfil ganha "Ajuda e contato", que leva ao mesmo canal com o e-mail da conta já
      preenchido.
- [ ] O canal de privacidade e o plano "Enterprise" continuam apontando para `/contact`, agora funcionando; o
      comentário de `privacyContact.ts` passa a descrever o comportamento real.

### Fora do corte

- **Guardar as mensagens** no Firestore, com histórico ou tela de tickets: viraria dado pessoal com retenção,
  exportação e exclusão próprias. O corte só entrega por e-mail.
- **E-mail de confirmação ao visitante**: alguém pode usar o formulário para mandar e-mail a terceiros em nome do
  fork. Fica fora até haver proteção contra isso.
- **Anexo de arquivo** (o campo de currículo atual): sai do formulário.
- **CAPTCHA de terceiro** e widget de chat: arrastam serviço externo para todo fork.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Uma ação pública de envio de contato. |
| `apps/api` | Rota pública com Zod, rate limit e `error.code`; usa o template que já existe. |
| `apps/app` | Item "Ajuda e contato" no menu do perfil. |
| `apps/web` | Formulário de contato real, com os componentes `HookForm*`. |
| `packages/*` | `email`: destino passa a ser a caixa de suporte. i18n: textos do formulário e `apiErrors` nos três idiomas. |
| Infra/env | Nenhuma variável nova: usa `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e o Resend que já são passo do fork. O `docs/ROPA.md` ganha a atividade de tratamento "contato". |

## Riscos e trade-offs

- **Spam.** Uma rota pública que dispara e-mail é alvo. Sem `ARCJET_KEY`, o rate limit da API é no-op
  (pendência 24 do backlog), e a landing não bloqueia bot (E13). O fork sem a chave fica exposto; isso precisa
  estar escrito no `docs/PRE-PRODUCTION.md`.
- **Caixa de suporte vazia.** Hoje `NEXT_PUBLIC_APP_SUPPORT_EMAIL` é opcional. Tornar o canal dependente dela muda
  o que um fork sem a variável vê: o formulário indisponível em vez de uma fachada.
- **Esforço.** P no limite: rota, formulário, item de menu, três idiomas, testes e duas linhas de documento.

## Sinais de pronto

- Com Resend e caixa de suporte configurados, uma mensagem enviada em `/es/contact` chega à caixa de suporte com o
  e-mail do visitante no "responder para" (🔒 na entrega real, provado com o envio simulado).
- Sem as variáveis, o formulário mostra o aviso de canal indisponível nos três idiomas e a API responde com código.
- Com `ARCJET_KEY` válida, as mensagens do mesmo IP acima do limite configurado são recusadas com código
  traduzido.
- O usuário logado abre "Ajuda e contato" e encontra o e-mail da conta preenchido.

## Decisões

- **D7, 2026-10-16:** a mensagem vai para a caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, sem variável nova. Ela já
  existe e configurá-la já é passo do fork (`PRE-PRODUCTION.md` §13).

## Perguntas em aberto

- O usuário logado usa a página da landing ou um diálogo dentro da app? — **recomendação:** a página da landing,
  para manter um formulário só; o `/analyze` pode inverter se o SSO entre as apps complicar o preenchimento.
