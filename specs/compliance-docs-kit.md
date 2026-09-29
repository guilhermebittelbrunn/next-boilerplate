---
id: compliance-docs-kit
title: "Modelos de conformidade: RoPA, incidente, subprocessadores e backup"
status: approved
value: médio
effort: P
audience: confianca
area: [docs]
mode: ambos
depends_on: []
contends_on: []
feature: -
updated: 2026-09-29
---

# Modelos de conformidade: RoPA, incidente, subprocessadores e backup

## Problema

O core entrega o código de privacidade: exportação e exclusão de conta, consentimento de cookies, trilha de
auditoria. O que ele não entrega são os documentos que a lei cobra de quem opera o fork, e é aí que um MVP
costuma chegar ao primeiro incidente sem saber o prazo de comunicação à ANPD, sem lista de quem processa os
dados dos seus usuários e sem ter testado se o backup do banco existe.

Esses documentos são quase iguais em todo fork, porque a stack é a mesma: Firebase, Stripe, Resend, Vercel,
Arcjet, Google Analytics. Escrever cada um do zero em cada fork é retrabalho, e pular é o risco.

## O que já existe no repo

- `docs/` tem `SECURITY.md` (modelo de segurança do código), `PRE-PRODUCTION.md` (passos manuais) e `SETUP.md`.
  `grep` por `incident`, `breach`, `vazamento`, `ANPD`, `RoPA`, `subprocess` e `DPA` nos `docs/*.md`: nenhum
  documento sobre isso. "Incidente" aparece só de passagem em `docs/PRE-PRODUCTION.md:52` e `:658`; os demais
  termos ficam em `specs/` (a nota `research/compliance-trust-baseline.md` e o `BACKLOG.md`).
- `apps/web/app/[locale]/legal/privacy/page.tsx` e `legal/terms/page.tsx` publicam avisos-modelo, com o texto em
  `packages/internationalization/translations/apps/web/pages/legal/index.ts` e o aviso "Substitua por sua
  política real" (`:41`, `:68`). O aviso de privacidade não tem de onde puxar a lista de subprocessadores.
- `apps/web/shared/lib/privacyContact.ts:10-19` — o canal do titular; o `docs/PRE-PRODUCTION.md` §7 já pede
  para cada fork definir `NEXT_PUBLIC_PRIVACY_CONTACT`.
- A coleção `auditEvent` registra ações sensíveis, e o prazo de retenção dela está estacionado (E5).
- Backup do Firestore: `grep` por `firestore export`, `gcloud firestore`, `backup` e `PITR` no repositório só
  acha o comando de TTL de `paymentEvent` (`docs/PRE-PRODUCTION.md:522`).
- **Lacuna:** nenhum modelo de registro de operações, runbook de incidente, lista de subprocessadores, nota de
  transferência internacional ou procedimento de backup e restauração.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md), controles 6, 8, 9 e
  19, e adendo de 2026-09-26.
- Natureza da obrigação: **lei**. Registro de operações: LGPD art. 37, que a Res. CD/ANPD 2/2022 art. 9º permite
  cumprir de forma simplificada para pequeno porte, sem isentar. Incidente: Res. CD/ANPD 15/2024, com
  comunicação à ANPD e ao titular em 3 dias úteis (em dobro para pequeno porte) e registro de todo incidente
  por 5 anos; GDPR art. 33, 72 horas. Subprocessadores e DPA: GDPR art. 28. Transferência internacional: LGPD
  arts. 33 e 35.
- A ANPD publica um modelo oficial de registro simplificado para pequeno porte, com oito campos
  (<https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/modelo_de_ropa_para_atpp.pdf>). A lista de campos
  foi confirmada só pelo resumo da página; o portal bloqueou a leitura direta em 2026-09-26.
- Os provedores do repositório publicam DPA e lista de subprocessadores em URLs estáveis (Firebase/Google,
  Stripe, Resend, Vercel); o DPA da Arcjet não foi encontrado.
- Backup gerenciado do Firestore exige o plano Blaze, guarda até 14 semanas e restaura sempre para um banco novo
  (<https://firebase.google.com/docs/firestore/backups>, 2026-09-26).
- Prevalência entre starters: não medida. É obrigação de operador, não recurso de produto.

## Proposta — corte de MVP

- [ ] Modelo de registro de operações que segue os campos do modelo da ANPD para pequeno porte, já
      preenchido com as operações que o core faz (cadastro, sessão, cobrança, e-mail, analytics com
      consentimento, trilha de auditoria), com lacunas marcadas para o fork completar.
- [ ] Runbook de incidente: quem decide, como avaliar se o incidente é comunicável, os prazos da ANPD e do
      GDPR com a fonte ao lado, o registro obrigatório e onde buscar evidência no repositório (trilha de
      auditoria, revogação de sessões, logs).
- [ ] Lista de subprocessadores do core, com finalidade, dado tratado, região quando o provedor informar, link
      do DPA e marcação de quais são opcionais (só entram se a variável estiver configurada).
- [ ] Nota de transferência internacional para os provedores fora do Brasil, apontando o mecanismo que cada
      DPA declara, sem afirmar adequação que a nota de pesquisa não confirmou.
- [ ] Procedimento de backup e restauração do Firestore, com o limite do plano Spark escrito e o teste de
      restauração como rotina.
- [ ] O `docs/PRE-PRODUCTION.md` aponta para os documentos novos no checklist do fork.

### Fora do corte

- `/.well-known/security.txt` e política de divulgação de vulnerabilidade (RFC 9116). É código na web e o campo
  `Expires` envelhece; entra se algum fork pedir.
- Texto real das páginas de privacidade e termos. Continua sendo conteúdo de cada fork.
- DPA com os clientes do fork (quando o fork é operador de dados de outra empresa). É contrato, não modelo de
  core.
- Automação de backup por script ou job agendado.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum. |
| `apps/app` | Nenhum. |
| `apps/web` | Nenhum no corte. |
| `packages/*` | Nenhum. |
| Infra/env | Nenhuma variável. Documentos novos em `docs/` e ponteiros no `docs/PRE-PRODUCTION.md`. |

## Riscos e trade-offs

- **Modelo não é parecer jurídico.** O texto precisa dizer isso no topo, sem virar ressalva em cada parágrafo.
- **Documento envelhece.** A lista de subprocessadores muda quando um provedor muda a dele, e os prazos da ANPD
  mudam com resolução nova. Cada documento leva a data da coleta e aponta para a nota de pesquisa, que tem
  `revalidate_after`.
- **Prova limitada.** O `/test` confere conteúdo, links e coerência com o código (a lista bate com as
  integrações reais), não conformidade.
- Custo em dinheiro: zero. O backup gerenciado, quando o fork adotar, é pago no Blaze, e isso fica escrito.

## Sinais de pronto

- Um fork novo encontra, a partir do `docs/PRE-PRODUCTION.md`, os quatro documentos e sabe o que preencher.
- A lista de subprocessadores cita exatamente as integrações que o código usa, e nenhuma a mais.
- O runbook responde, sem pesquisa, "em quantos dias úteis preciso comunicar a ANPD".
- O procedimento de backup diz o que fazer no plano Spark, onde não há backup gerenciado.

## Perguntas em aberto

- Os documentos ficam em português só, ou nos três idiomas? — **recomendação:** português, com os trechos de
  GDPR citando o texto em inglês; `docs/` é interno e o repositório já escreve assim.
- Incluir o `security.txt` no corte? — **recomendação:** não; é código com manutenção periódica e nenhuma
  prevalência medida.
