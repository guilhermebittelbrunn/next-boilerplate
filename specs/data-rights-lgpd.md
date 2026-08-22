---
id: data-rights-lgpd
title: "Direitos do titular: exportar dados e excluir conta"
status: proposed
value: alto
effort: G
audience: confianca
area: [apps/api, apps/app, apps/web, packages/sdk, packages/auth, packages/internationalization]
mode: ambos
depends_on: [account-settings]
feature: -
updated: 2026-08-21
---

# Direitos do titular: exportar dados e excluir conta

## Problema

Quem se cadastra num fork deste boilerplate hoje não tem como levar os próprios dados embora nem como
sair. Não existe botão, não existe pedido, não existe canal: o único caminho é escrever para alguém que
nem está publicado em lugar nenhum. Do outro lado, o operador do fork recebe o pedido e não tem
ferramenta para atender — vai abrir o console do Firebase e apagar documentos na mão.

Não é conveniência: **é obrigação legal de qualquer fork que opere no Brasil ou atenda europeus**, com
prazo contado. E fica mais cara com o tempo — quanto mais coleções, arquivos e assinaturas o produto
acumula, maior o estrago de uma exclusão feita errado.

## O que já existe no repo

- `apps/api/app/(routes)/users/[id]/route.ts:75` — existe um `DELETE`, mas sob `requireAdminApi`: **rota
  administrativa**, não autoatendimento do titular. O usuário comum não a alcança.
- `apps/api/(shared)/repositories/base.repository.ts:133` — o `delete()` herdado por todo repositório é
  **soft delete**: grava `deletedAt` e nada mais. A conta no Firebase Auth continua existindo e o e-mail
  continua ocupado. Hoje "excluir" não exclui.
- `apps/api/app/(routes)/` — o inventário completo de rotas é `auth`, `health`, `users`, `entities`,
  `webhooks`. **Nenhuma rota de exportação.**
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/` — o painel comum tem `entities`, `playground`
  e a home. **Não existe área de conta**; é a spec `account-settings` que a cria.
- `apps/web/app/[locale]/legal/privacy/page.tsx:15` e `.../legal/terms/page.tsx` — as páginas legais
  **existem** nos 3 idiomas via dictionary
  (`packages/internationalization/translations/apps/web/pages/legal/index.ts:15`), **mas o conteúdo é
  placeholder**: o próprio texto avisa "Este é um modelo do boilerplate. Substitua por sua política real
  antes de publicar" (`:27`) e a política tem **3 seções genéricas**. "Seus direitos" (`:39`) manda
  "entrar em contato conosco" — sem dizer com quem.
- Busca por `encarregado`, `DPO`, `data protection officer` ou endereço de privacidade em `apps/` e
  `packages/`: **zero ocorrências**. Não há canal publicado.
- **Lacuna:** nem exportação, nem exclusão pelo titular, nem tela, nem canal de contato — e o único
  mecanismo de exclusão existente apaga só a marca de um documento.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) (controles 1, 2,
  3, 4, 6, 7, 8, 9 e 19) · [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- **Prevalência é baixa e isso não é desculpa:** exclusão de conta aparece em **4/10** starters e
  exportação de dados em **0/10**. A obrigação não vem do mercado, vem da lei — e é por quase ninguém
  entregar que isso vira diferencial de confiança do core.
- **LGPD art. 18** garante 9 direitos, incluindo **portabilidade (18-V)** e **eliminação dos dados
  tratados com consentimento (18-VI)**; o **§ 5º** obriga a atender **sem custos ao titular**.
- **Prazos — LGPD art. 19**: confirmação/acesso em **formato simplificado, imediatamente** (inc. I); ou
  **declaração clara e completa em até 15 dias** (inc. II). Para agente de **pequeno porte**, a
  **Res. CD/ANPD nº 2/2022, art. 14, I e III** dobra esses prazos (→ **30 dias** para a declaração
  completa) e o **art. 15** permite entregar a declaração simplificada **em até 15 dias** em vez de
  "imediatamente". No **GDPR art. 12(3)**: "without undue delay and in any event **within one month**",
  prorrogável por **2 meses adicionais**, informando o titular dentro do primeiro mês.
- **Aviso de privacidade e termos são obrigatórios** (controle 4: LGPD art. 9º; GDPR art. 13) — a rota já
  existe, falta conteúdo real nos 3 idiomas.
- **Canal do encarregado** (controle 7): a **Res. 2/2022 art. 11** dispensa o pequeno porte de **indicar
  encarregado**, mas **desde que disponibilize um canal de comunicação com o titular** (§ 1º). Dispensa de
  pessoa, não de canal.
- Dois atalhos falsos: o **registro de operações** (controle 6) pode ser cumprido "de forma simplificada"
  pela **Res. 2/2022 art. 9º** — **simplificação, não isenção**; e o **GDPR art. 30(5)** parece isentar
  quem tem menos de 250 funcionários, mas a isenção **cai quando o tratamento "is not occasional"**, que
  é o caso de **qualquer SaaS**.

## Proposta — corte de MVP

- [ ] Na área de conta, o titular **baixa um arquivo com os próprios dados** — perfil, registros que criou
      e metadados de conta — em formato legível por máquina, sem pedir nada a ninguém e sem custo.
- [ ] O titular **solicita a exclusão da própria conta** com confirmação explícita: uma ação do produto,
      com estado visível e resultado observável, não um e-mail para alguém.
- [ ] A exclusão é **coordenada, não parcial**: encerra o acesso, remove ou anonimiza os dados e **não
      deixa órfãos** — assinatura ativa e arquivos do fork são cancelados/limpos no mesmo fluxo, e o que a
      lei obriga a reter fica retido de forma justificada, não por esquecimento.
- [ ] A resposta ao titular declara **o prazo aplicável**, coerente com os artigos acima, nos 3 idiomas.
- [ ] O **canal de contato de privacidade** passa a existir e a ser publicado nas páginas legais, com o
      conteúdo real substituindo o placeholder de aviso de privacidade e termos.

### Fora do corte

- Os **demais direitos do art. 18** com fluxo próprio (correção, anonimização/bloqueio, informação sobre
  uso compartilhado, revogação de consentimento) — o corte cobre acesso/portabilidade e eliminação.
- Painel administrativo de pedidos de titular com fila, SLA e histórico; exportação assíncrona com link
  expirável para volumes grandes.
- **Tudo que é documento, não código** — e a nota é explícita nesse corte: **RoPA** (controle 6),
  **runbook de incidente** (controle 8), **DPA e subprocessadores** (controle 9) e **transferência
  internacional** (controle 19) entram como **template em `docs/` + checklist de fork**, em spec própria.
  Misturá-los aqui infla o escopo e não produz nada executável. Retenção de registro de acesso
  (controle 10) é configuração de bucket no provedor.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ações novas de exportação e de encerramento de conta pelo próprio titular. |
| `apps/api` | Rotas sob guard de **painel comum** com posse pelo sujeito da sessão (nunca `requireAdminApi`); orquestração da exclusão coordenada; `error.code` traduzível para cada recusa. |
| `apps/app` | Duas ações dentro da área de conta criada por `account-settings`, com confirmação destrutiva. |
| `apps/web` | Conteúdo real de privacidade/termos + canal de privacidade publicado nas páginas legais. |
| `packages/*` | i18n nos 3 idiomas (copy da confirmação, prazos e `apiErrors`); `auth` para encerrar a conta de autenticação. |
| Infra/env | Endereço/canal de privacidade por fork; possível índice no Firestore para varrer o que pertence ao titular. |

## Riscos e trade-offs

- **Acoplamento de ordem com `billing-subscription` e `file-upload-storage`.** Não bloqueiam o começo —
  por isso ficam fora do `depends_on` —, mas são **acopladas por definição de pronto**: no dia em que o
  fork tiver assinatura Stripe ou arquivos em bucket, a exclusão precisa cancelar e limpar, senão produz
  o órfão que a nota aponta como armadilha central (assinatura ativa cobrando um titular que não existe
  mais). Quem entregar por último paga a integração — daí a exclusão nascer com pontos de extensão em que
  cada uma dessas specs se registra.
- **Exclusão é irreversível e boilerplate é copiado sem leitura.** O soft delete atual já é armadilha
  silenciosa (declara-se conformidade tendo marcado um campo); e uma implementação agressiva demais
  destrói dado que a lei manda reter, tímida demais não cumpre o art. 18-VI. O equilíbrio — anonimizar
  quando há retenção obrigatória — tem de ser padrão do core, não escolha de cada fork.
- **Custo herdado:** zero em dinheiro (a nota classifica direitos, exportação e exclusão como "zero custo
  em dinheiro"), mas manutenção permanente — **toda coleção nova precisa entrar no exportador e no fluxo
  de exclusão**, ou os dois passam a mentir. E há vetor de abuso: exportação sem limite é enumeração
  barata; exclusão sem reautenticação é sequestro de sessão virando destruição de conta.

## Sinais de pronto

- O titular baixa os próprios dados pela área de conta, sem pedir a ninguém e sem pagar nada.
- Depois de excluir, o titular não consegue mais entrar, e o que restou dele está anonimizado ou retido
  com justificativa — nunca acessível como antes.
- Nenhuma cobrança ou arquivo sobrevive à exclusão de um titular que tinha assinatura ou arquivos.
- Privacidade e termos têm conteúdo real nos 3 idiomas e o canal de privacidade está visível e funcional.
- O prazo comunicado ao titular corresponde ao que a norma aplicável exige.

## Perguntas em aberto

- Exclusão **apaga** ou **anonimiza** por padrão? — **recomendação:** anonimizar o que tem retenção
  obrigatória e apagar o resto; apagar tudo colide com o dever de guardar registro de acesso.
- O fork se declara **agente de pequeno porte** (prazos em dobro da Res. 2/2022) ou assume o prazo cheio?
  — **recomendação:** o core anuncia o prazo mais curto (15 dias) e documenta a folga; prometer 30 dias
  por padrão passa a mensagem errada num produto que responde em segundos.
- Exclusão exige **reautenticação recente** e exportação é **síncrona**? — **recomendação:** sim para as
  duas; a reautenticação alinhada ao que `account-security-mfa` definir para ações sensíveis, e a
  exportação só vira assíncrona quando o volume medido de um fork exigir.
