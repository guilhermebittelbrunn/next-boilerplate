---
id: audit-log
title: Trilha de auditoria de ações sensíveis
status: proposed
value: alto
effort: M
audience: confianca
area: [apps/api, apps/app, packages/sdk, packages/internationalization]
mode: ambos
depends_on: [firestore-admin-access]
feature: -
updated: 2026-08-22
---

# Trilha de auditoria de ações sensíveis

> **Nota de auditoria (2026-08-22):** a parte de **autorização** que esta spec citava como buraco aberto —
> mutação pelas rotas comuns durante impersonação — foi fechada em
> `docs/features/impersonation-read-only/`. O corte de MVP daqui (o **registro**) segue integralmente
> pendente.

## Problema

Um administrador deste boilerplate pode assumir a identidade de qualquer usuário comum e ver tudo o que ele
vê — e nada disso deixa rastro. Também não fica registro de quem excluiu um usuário, de quem
alterou um perfil, nem de quem entrou em qual conta e quando. Se um cliente perguntar "quem mexeu nos meus
dados?", ou se a autoridade perguntar depois de um incidente, a resposta hoje é: não sabemos. É o recurso de
suporte mais poderoso do produto operando sem contrapartida.

## O que já existe no repo

- **Impersonação completa, ponta a ponta:** `apps/app/shared/stores/panelStore.ts:76-90` grava o alvo,
  espelhado nos cookies `bp:panel-request-role` / `bp:impersonate-firebase-uid`
  (`apps/app/shared/lib/panelState.ts:18-19`), acionado pela UI em
  `apps/app/shared/components/ui/PanelNavbarControls.tsx`; na API,
  `apps/api/(shared)/lib/auth-request-context.ts:83-147` valida o contexto e expõe `isImpersonating` (`:141`).
- **Mutação sob impersonação já está fechada nos dois painéis:**
  `apps/api/(shared)/lib/impersonation-read-only.ts:19-31` recusa métodos não seguros quando
  `isImpersonating`, chamado por `apps/api/app/(guards)/admin.ts:62` e
  `apps/api/app/(guards)/common-panel.ts:62`. Personificando, o admin **lê** e não escreve em rota alguma —
  isso é **autorização**, e foi entregue fora desta spec (`docs/features/impersonation-read-only/`).
- **O que continua sem rastro:** a impersonação em si não é registrada — ninguém sabe quem entrou na conta
  de quem, quando entrou nem quando saiu. E as ações do admin **como ele mesmo** também não deixam registro:
  `apps/api/app/(routes)/users/[id]/route.ts:75-91` exclui um usuário devolvendo 204 e `:54-68` altera
  perfil e credencial de Auth, ambos em silêncio.
- **Nenhuma trilha existe:** só há os repositórios `base`, `entity` e `user`
  (`apps/api/(shared)/repositories/`), e varrer "audit" no código retorna apenas três comentários
  (`packages/shared/utils/helpers/auth-request-headers.ts:12`, `packages/auth/types.ts:22`,
  `apps/app/shared/lib/authRequestHeaders.ts:19`) — nenhum handler, coleção ou rota.
- Sem logger estruturado: só `console.error/warn` avulso (`apps/api/app/(routes)/users/route.ts:71`,
  `.../webhooks/payments/route.ts:66,72`), e `apps/api/instrumentation.ts:1-2` está vazio.
- **Lacuna:** nenhum evento sensível é persistido e nenhuma retenção de log de acesso está configurada.

## Evidência de mercado

- Notas: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) ·
  [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- **Prevalência da impersonação: 2/10 starters.** O benchmark é direto: "maior ROI para suporte e maior
  risco: exige log de auditoria (quem, quem, quando), sessão marcada e proibição de ações
  destrutivas/billing". Este repo entregou o recurso raro e ficou devendo as contrapartidas.
- **Controle 10 — Marco Civil da Internet art. 15:** provedor de aplicações **pessoa jurídica, com fins
  econômicos** deve guardar **registros de acesso a aplicações por 6 meses**; a nota é explícita ("Isso *é*
  um SaaS"). Registro de acesso = data/hora de uso a partir de um IP (**art. 5º, VIII**). ⚠️ A nota alerta
  que o **art. 13 (1 ano) é de conexão** — ISP, não se aplica — e que o **art. 14 proíbe** ao provedor de
  conexão guardar registro de aplicação.
- **Controle 8 — Res. CD/ANPD nº 15/2024, art. 10:** manter registro do incidente — **inclusive dos não
  comunicados — por no mínimo 5 anos**. O **art. 6º** exige comunicar à ANPD em **3 dias úteis** (§ 8º:
  dobro para pequeno porte → **6 dias úteis**) e o **art. 9º**, ao titular também em **3 dias úteis**;
  responder "quem acessou o quê" nesses prazos exige a trilha pronta **antes** do incidente.
- **Retenção de infra:** no GCP o bucket `_Default` retém **30 dias** (insuficiente para os 6 meses do
  art. 15) e os Data Access logs do Firestore são **opt-in**. **OWASP Top 10:2025** lista **A09 Security
  Logging and Alerting Failures**.
- Fontes (da nota): <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm> ·
  <https://dspace.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html> · <https://cloud.google.com/logging/quotas>

### Duas coisas diferentes com o mesmo nome

- **Trilha de ações (produto — é código):** quem fez o quê, sobre qual registro, quando e sob qual
  identidade, incluindo início e fim de impersonação. Vive no banco da aplicação e é consultável na admin.
- **Log de acesso do Marco Civil (infra — é configuração):** data/hora de uso a partir de um IP, retido por
  6 meses. É retenção de bucket no projeto de cada fork, não uma coleção da aplicação. Desde o
  **Decreto 12.975/2026** (que inseriu o art. 15-A no Decreto 8.771/2016), o IP guardado deve incluir a
  **porta lógica de origem**.

Esta spec cobre a primeira **como código** e a segunda **como checklist de fork documentado**.

⚠️ **E a lei não justifica a primeira.** Não existe, no Brasil, obrigação legal de trilha de auditoria de
negócio com prazo. O regulamento aponta no sentido **oposto**: **Decreto 8.771/2016, art. 13, § 2º** manda
"reter a **menor quantidade possível** de dados pessoais […] os quais deverão ser excluídos: I – tão logo
atingida a finalidade de seu uso". A LGPD tampouco fixa prazo — a ANPD confirma no FAQ (item 5.5) que "a
LGPD não especifica um prazo durante o qual pode haver o tratamento dos dados pessoais".

Consequência para esta spec: a trilha de ações se justifica por **accountability** (LGPD art. 6º, X), por
segurança operacional e por prova contratual — **nunca** invocando o Marco Civil. O prazo de retenção dela
precisa de finalidade declarada, porque guardar além do necessário é o próprio risco que o Decreto 8.771
manda evitar. **"A lei exige 6 meses de logs" é uma generalização falsa** e não deve entrar em código, doc
nem mensagem de commit deste repo.

## Proposta — corte de MVP

- [ ] Ações sensíveis geram evento persistido: início/fim de impersonação, exclusão de usuário e alteração
      de perfil por admin.
- [ ] Cada evento identifica **ator, sujeito, ação, alvo e momento** — quem agiu × em nome de quem.
- [ ] A trilha é consultável na área admin, filtrável por período e usuário, traduzida nos três idiomas.
- [ ] O registro é somente-adição: nenhuma rota permite editar ou apagar evento gravado.
- [ ] A retenção do log de acesso de infra (6 meses) vira passo do checklist de fork, com o prazo escrito.

### Fora do corte

- Exportar a trilha e expurgo automático — dependem de decisão de prazo por fork.
- Alerta em tempo real sobre ação sensível — depende de `observability-logging`.
- Auditar toda escrita de qualquer recurso: começa caro, envelhece mal e gera ruído.
- Bloquear mutações da impersonação nas rotas comuns: era **autorização**, não auditoria — **já entregue**
  em `docs/features/impersonation-read-only/`, fora desta spec.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Recurso novo de **leitura** da trilha; nenhuma escrita exposta ao cliente. |
| `apps/api` | Coleção nova, escrita a partir dos guards/rotas das ações sensíveis, e leitura restrita a admin. |
| `apps/app` | Tela na área admin; a sinalização de "operando como outro usuário" já existe no painel. |
| `apps/web` | N/A. |
| `packages/*` | i18n dos rótulos de ação e colunas; nada novo no design system além do `Table`. |
| Infra/env | Índice do Firestore para consulta por período/usuário; retenção do bucket de log no projeto do fork (configuração, não código). |

## Riscos e trade-offs

- **Custo herdado por todo fork:** cada ação sensível custa uma escrita a mais e a coleção cresce sem
  expurgo. Um fork que remova a impersonação herda a trilha assim mesmo — ela precisa ser útil sem esse
  recurso (exclusões e alterações por admin já bastam).
- **Depende de `firestore-admin-access`:** trilha somente-adição escrita por cliente não autenticado não é
  trilha — quem escreve, reescreve. Entregar antes é dar ao suspeito o papel que ele pode rasgar.
- A trilha guarda dado pessoal (quem acessou o quê) e vira objeto de proteção: acesso restrito a admin.
- Falhar ao gravar não pode derrubar a ação principal; ação concluída sem registro também é ruim. É a
  decisão de projeto mais delicada aqui, e é do `/analyze`.

## Sinais de pronto

- Um admin entra no contexto de um usuário, altera algo e sai: os três momentos aparecem na trilha.
- Excluir um usuário deixa registro que **sobrevive** à exclusão do próprio usuário.
- A tela responde "quem acessou/alterou o quê e quando" num período, sem consulta manual ao banco, e nenhum
  caminho da aplicação edita ou apaga evento gravado.
- O checklist de fork diz, com o prazo, o que configurar para reter o log de acesso por 6 meses.

## Perguntas em aberto

- Por quanto tempo reter os eventos da trilha de **ações**? — **recomendação:** prazo configurável, com
  finalidade declarada, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso). Os únicos prazos
  legais firmes aqui são 6 meses para registro de acesso e 5 anos para registro de incidente
  (Res. CD/ANPD nº 15/2024, art. 10).
- Registrar leituras ou só escritas + impersonação? — **recomendação:** só escritas + impersonação; auditar
  leitura multiplica volume e custo.
- ~~Fechar as mutações de impersonação nas rotas comuns?~~ **Resolvida** — foi feito como tarefa de
  autorização própria, exatamente como recomendado aqui. Esta spec deixa de carregar a pergunta e passa a
  cobrir só o **registro**.
