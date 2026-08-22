---
id: transactional-emails
title: E-mails transacionais traduzidos
status: proposed
value: alto
effort: M
audience: produto
area: [packages/email, packages/internationalization, apps/email, apps/api]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
---

# E-mails transacionais traduzidos

## Problema

O boilerplate sabe enviar exatamente **um** e-mail: o formulário de contato da landing. Não existe boas-vindas, confirmação nem aviso de nada — e, mais grave, não existe **como** mandar um e-mail traduzido, porque o dicionário do repo não cobre e-mail e o único template tem texto em inglês escrito direto no JSX.

Consequência prática: toda funcionalidade que precise falar com o usuário fora do app (redefinir senha, verificar e-mail, avisar que a cobrança falhou, convidar alguém) **começa do zero**, e cada fork resolve à sua maneira. Um produto que se apresenta em pt-br/en/es e manda e-mail em inglês perde a promessa inteira de i18n justamente na única mensagem que o usuário lê fora da tela.

## O que já existe no repo

- `packages/email/index.ts:4` — exporta **só** o cliente `resend`. Nenhum helper de envio, nenhum layout, nenhuma resolução de idioma.
- `packages/email/templates/` — **um único arquivo**, `contact.tsx`: `ContactTemplate:19` (React Email + Tailwind) e `PreviewProps:48`. O texto é literal em inglês — `:27`, `<Preview>New email from {name}</Preview>`.
- `packages/email/keys.ts:7-8` — `RESEND_FROM` e `RESEND_TOKEN`, ambos `.optional()`; `:14` desliga a validação quando faltam. As três apps declaram essas chaves (`apps/app/env.ts:1`, `apps/web/env.ts:1`, `apps/api/env.ts:2`) mas **nenhuma envia nada**.
- `apps/email/package.json:7` — o preview do React Email já roda na porta 3003 apontando para `packages/email/templates`. A ferramenta está pronta; só não há o que revisar nela.
- Único consumidor em todo o repo: `apps/web/app/[locale]/contact/actions/contact.tsx:3-4` e `:35`.
- `packages/internationalization/translations/` tem três ramos — `apps/`, `components/`, `packages/` — e **nenhum de e-mail**. O padrão de paridade pt-br/en/es (e o teste que o cobra) já existe e é reaproveitável como está.
- **Lacuna:** não há camada de envio (assunto, remetente, idioma, tratamento de falha), não há layout comum e não há um só template de produto.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- A nota é explícita sobre a armadilha exata deste repo: **"i18n real — 4/10: a armadilha recorrente é traduzir a UI e esquecer e-mails transacionais e mensagens de erro da API"**. Este boilerplate já resolveu a segunda metade (erro por `error.code` traduzido) e deixou a primeira intacta.
- Prevalência indireta: os e-mails que esta spec habilita sustentam os dois itens mais universais do painel — auth completo (**10/10**, que inclui verificação e recuperação) e assinatura (**9/10**). O valor não é do e-mail em si; é de ser **pré-requisito** deles.
- Convite por e-mail (5/10) e notificações (3/10) dependem da mesma base — e a nota registra que o next-forge terceiriza notificação no Knock, "o que traz chave/serviço externo obrigatório".
- Fontes: <https://resend.com/docs/send-with-nextjs> · <https://react.email/docs/introduction>

## Proposta — corte de MVP

- [ ] Uma forma única e tipada de enviar e-mail a partir do servidor, que recebe o idioma do destinatário e resolve assunto e corpo pelo dicionário.
- [ ] Um layout comum (cabeçalho, rodapé, assinatura, tema) que todo template herda, para o fork trocar marca em um lugar só.
- [ ] Uma árvore de e-mail no `@repo/internationalization`, com paridade pt-br/en/es cobrada pelo mesmo teste determinístico que já existe.
- [ ] Dois templates reais usando a base — boas-vindas e um de ação com link — provando o slice de ponta a ponta.
- [ ] Todos os templates visíveis e revisáveis no preview da porta 3003, nos 3 idiomas.
- [ ] Falha de envio não derruba a operação que a originou, e fica registrada.

### Fora do corte

- **Templates de recuperação de senha, verificação e cobrança** — pertencem às specs que os disparam (`auth-recovery-verification`, `billing-subscription`); aqui entregamos a base e a prova.
- **Preferência de notificação por usuário** — parte de `account-settings` e, no limite, de uma spec de notificações (3/10 na nota).
- **Digest, agendamento, fila e retry** — a nota classifica notificação com preferências como esforço **G**; nada disso cabe aqui.
- **Provedor plugável** (trocar Resend por SES/Postmark) — só quando algum fork pedir.
- **Rastreio de abertura/clique** — arrasta discussão de privacidade sem valor para um MVP.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | nenhum — e-mail é server-side, não passa pela fachada do front |
| `apps/api` | passa a poder notificar a partir de rotas; nenhuma rota nova no corte |
| `apps/app` | nenhum no corte |
| `apps/web` | o envio do formulário de contato migra para o layout e a copy traduzida |
| `packages/*` | `email` ganha camada de envio + layout + templates; `internationalization` ganha o ramo de e-mail nos 3 idiomas |
| Infra/env | `RESEND_FROM` e `RESEND_TOKEN` deixam de ser decorativas; domínio verificado com registros de DNS por ambiente |

## Riscos e trade-offs

- **Custo herdado por todo fork:** e-mail transacional exige conta no provedor **e** verificação de domínio (DNS) — passo manual sem contorno. Enquanto `keys.ts:14` deixar as chaves opcionais, o fork sobe sem enviar nada e só descobre em produção; e enquanto for a única saída de comunicação, `auth-recovery-verification` fica bloqueada por ela. Cotas do free tier do Resend: **não verificadas** nesta nota.
- **Entregabilidade não é problema de código.** Domínio novo cai em spam; sem SPF/DKIM o e-mail de redefinição some. É custo operacional recorrente de cada fork, não de uma entrega.
- **Duplicação de copy.** Se a copy nascer fora do dicionário "porque é só um texto", o repo volta ao problema em três meses. A árvore de i18n é o item não-negociável do corte.
- **Idioma do destinatário nem sempre é conhecido.** Sem preferência persistida por usuário (que é de `account-settings`), o envio precisa de um idioma padrão explícito — e vai errar às vezes.
- **Template é UI e envelhece como UI:** cliente de e-mail não é browser, e o que fica bonito no preview quebra no Outlook.

## Sinais de pronto

- Um e-mail disparado com locale `es` chega em espanhol, assunto incluído.
- Trocar logotipo e cor da marca em um lugar muda todos os templates.
- Faltar uma chave em um dos 3 idiomas quebra o teste de paridade.
- O preview na porta 3003 lista os templates com dados de exemplo.
- Sem `RESEND_TOKEN`, o app continua funcionando e o não-envio aparece no log — não como erro 500 na cara do usuário.

## Perguntas em aberto

- De onde vem o idioma do envio na ausência de preferência salva? — **recomendação:** do locale da requisição que originou a ação, com pt-br como padrão.
- A rota de contato da `apps/web` migra agora ou fica como está? — **recomendação:** migrar; é o consumidor real que valida a base sem inventar caso de teste.
- Layout com Tailwind (como o template atual) ou tabelas clássicas? — **recomendação:** manter Tailwind via React Email, que é o que já está em uso, aceitando as limitações em clientes antigos.
