---
id: data-rights-lgpd
title: "Direitos do titular: exportar dados e excluir conta"
status: done
value: alto
effort: G
audience: confianca
area: [apps/api, apps/app, apps/web, packages/sdk, packages/auth, packages/internationalization]
mode: ambos
depends_on: [account-settings]
contends_on: [apps/api/(shared)/repositories/base.repository.ts, packages/auth/server.ts, firestore.indexes.json]
feature: data-rights-lgpd
updated: 2026-09-23
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

- `apps/api/app/(routes)/users/[id]/route.ts:101` — existe um `DELETE`, mas sob `requireAdminApi`: **rota
  administrativa**, não autoatendimento do titular. O usuário comum não a alcança. ⚠️ **Âncora atualizada
  em 2026-09-17:** a PR #18 acrescentou a gravação da trilha ao `PUT` acima, empurrando o `DELETE` de
  `:75` para cá. A rota agora também registra a exclusão na trilha (`:119-128`), lendo o rótulo do alvo
  antes de apagar — o que não a torna autoatendimento.
- `apps/api/(shared)/repositories/base.repository.ts:209-211` — o `delete()` herdado por todo repositório
  é **soft delete**: `this.update({ id, deletedAt: new Date() })` (`:206`) e nada mais. A conta no Firebase
  Auth continua existindo e o e-mail continua ocupado. Hoje "excluir" não exclui. ⚠️ **Âncora atualizada em
  2026-09-23:** a PR #17 já havia empurrado o `delete()` de `:127-129` para `:196-198`, a PR #19 o levou
  para `:205-207` ao inserir `countQuery` em `:122`, e a PR #22 o empurrou para `:209-211` ao reescrever o
  `create()`. O comportamento não mudou em nenhuma das três.
- `apps/api/app/(routes)/` — o inventário completo é `account` (PR #12), `audit-events` (PR #18), `auth`,
  `health`, `users`, `entities`, `files` (PR #11) e `webhooks` — **8 grupos, 23 `route.ts`** (a PR #19
  acrescentou `entities/summary` e `users/summary`, a PR #22 acrescentou `users/activity-summary`, nenhuma
  delas criou grupo novo). **Nenhuma rota de exportação e nenhum `DELETE` de auto-serviço:** `account/`
  expõe só `GET`/`PUT` (`route.ts:97,107`), `POST /account/password` (`:18`) e
  `POST /account/sessions/revoke` (`:7`).
  *(Contagem e âncoras remedidas em 2026-09-23.)*
- ✅ **A área de conta passou a existir (PR #12), e isso barateia esta spec.**
  ⚠️ *A versão anterior desta linha afirmava "**Não existe área de conta**" — falso desde `a4df5ed`.*
  `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/` tem 10 arquivos e 4 abas (perfil,
  segurança, preferências, cobrança). **Consequência para o corte:** as duas ações desta spec (baixar meus
  dados, excluir minha conta) têm onde morar — aba, rota, guard de painel comum e copy traduzida já
  montados. Ela deixa de inaugurar superfície e passa a acrescentar dois botões a uma tela pronta.
- `apps/web/app/[locale]/legal/privacy/page.tsx:15` e `.../legal/terms/page.tsx` — as páginas legais
  **existem** nos 3 idiomas via dictionary
  (`packages/internationalization/translations/apps/web/pages/legal/index.ts:15`), **mas o conteúdo é
  placeholder**: o próprio texto avisa "Este é um modelo do boilerplate. Substitua por sua política real
  antes de publicar" (`:28`, com o mesmo aviso em `:78` para en e `:128` para es) e a política tem **3
  seções genéricas**. "Seus direitos" (`:39`) manda "entrar em contato conosco" — sem dizer com quem.
- Busca por `encarregado`, `DPO`, `data protection officer` ou endereço de privacidade em `apps/` e
  `packages/`: **zero ocorrências**. Não há canal publicado.
- 🆕 **Passou a existir consentimento de cookies (PR #16), e ele muda dois pontos desta spec.**
  `packages/analytics/consent.ts:1,8-13` grava a escolha no cookie `bp:cookie-consent`, versionado e com
  TTL de 180 dias; `packages/design-system/components/ui/cookie-consent.tsx` entrega banner e
  preferências; o visitante revoga por `apps/web/app/[locale]/components/cookiePreferencesButton.tsx:13` e
  `apps/app/shared/components/ui/ProfileDropdown.tsx:29`. As duas consequências:
  1. **O exportador do item 1 precisa incluir o registro de consentimento.** Prova de consentimento é
     obrigação do controlador e hoje a escolha vive só no navegador do titular — quem limpar os cookies
     apaga a única cópia.
  2. **A política placeholder virou destino de link.** O banner aponta para `/legal/privacy`
     (`apps/web/app/[locale]/layout.tsx:39`, `apps/app/app/layout.tsx:48`), e
     `grep -ni cookie packages/internationalization/translations/apps/web/pages/legal/index.ts` devolve
     **zero**: o produto pede consentimento de cookie e linka uma política que não fala de cookies em
     nenhum dos 3 idiomas. Isso dá urgência ao item 5 do corte, que a spec tratava como pendência difusa.
- **Lacuna:** nem exportação, nem exclusão pelo titular, nem tela, nem canal de contato — e o único
  mecanismo de exclusão existente apaga só a marca de um documento.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](../../../specs/research/compliance-trust-baseline.md) (controles 1, 2,
  3, 4, 6, 7, 8, 9 e 19) · [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
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

> 🆕 **Obrigação transferida em 2026-09-19 — o carimbo de último acesso.** Os dois itens acima precisam
> cobrir `lastAccessAt`, o campo que a PR #21 acrescentou ao perfil
> (`packages/sdk/src/types/user/user.ts:27`). O corte de
> [`user-activity-tracking`](../user-activity-tracking/spec.md) pedia que o campo entrasse no
> export e na exclusão, e **não havia onde ligá-lo**: não existe rota de export,
> `apps/api/app/(routes)/account/route.ts` não tem `DELETE` (só `GET:97` e `PUT:107`), e o `delete()`
> herdado é soft delete (`apps/api/(shared)/repositories/base.repository.ts:209-211`), que preserva o
> documento inteiro. Aquela spec entregou a declaração escrita (`docs/PRE-PRODUCTION.md:497-504`, que
> enumera o que ainda **não** é verdade) e foi arquivada com o item parcial. **Fechá-lo é responsabilidade
> desta spec** — e o custo é próximo de zero, porque o campo vive no mesmo documento de perfil que o export
> e a exclusão já vão tratar. O que ele acrescenta é uma linha de teste, não um fluxo.
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

- 🔴 **O acoplamento com `file-upload-storage` deixou de ser hipótese (remedido em 2026-09-14).** A spec
  foi **entregue e arquivada** em `docs/features/file-upload-storage/spec.md` pela PR #11: o fork já tem
  arquivos em bucket, e `entity.photo` passou a guardar **referência de objeto**, não mais um dado inerte.
  Consequência direta: a exclusão de conta **precisa** limpar os objetos do bucket
  (`apps/api/(shared)/lib/storage.ts`, `deleteObjectQuietly`), e isso não é trabalho futuro — é requisito
  de hoje. Agrava o quadro que os **dois** call sites de `deleteObjectQuietly` em produção sejam ambos de
  **troca**, nunca de expurgo: `entities/[id]/route.ts:90` (foto de entidade) e
  **`account/route.ts:158` (avatar de perfil — novo na PR #12)**. Não existe nenhum caminho que apague
  objetos em lote por titular, então **apagar a conta hoje deixa os objetos órfãos no bucket** — pagos, e
  ainda contendo dado pessoal de alguém que exerceu o direito de eliminação.
  ⚠️ *Contagem corrigida em 2026-09-15: a spec dizia "**um único** call site". São **dois**, e agora são
  **duas famílias de objeto por titular** (foto de entidade + avatar), em coleções diferentes. O trabalho
  de expurgo dobrou antes de começar — e vai dobrar de novo a cada recurso novo que aceite upload, que é
  exatamente o argumento para resolver isso com uma varredura por prefixo de dono, e não caso a caso.*
- **Acoplamento de ordem com `billing-subscription`.** Não bloqueia o começo — por isso fica fora do
  `depends_on` —, mas é **acoplado por definição de pronto**: no dia em que o fork tiver assinatura
  Stripe, a exclusão precisa cancelar, senão produz o órfão que a nota aponta como armadilha central
  (assinatura ativa cobrando um titular que não existe mais). Quem entregar por último paga a integração —
  daí a exclusão nascer com pontos de extensão em que cada uma dessas specs se registra.
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

## Estado da entrega

Auditado em 2026-09-23 pelo `/spec --sync`. PR **#23** mergeada em `main` em 2026-09-24T02:32:17Z (merge
commit `ab11a5b`), com CI `success` nesse SHA (`gh run 35947675147`). Os cinco itens do corte, reabertos no
código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. O titular baixa um arquivo com os próprios dados, sem pedir a ninguém | **implementado** | `GET /account/export` sob `requireCommonPanelApi` (`apps/api/app/(routes)/account/export/route.ts:9`), recusado durante impersonação (`:12-17`) e registrado na trilha (`:29-38`). O conteúdo sai de `buildAccountDataExport` (`apps/api/(shared)/lib/account-export.ts:95-129`): perfil, registros criados, eventos da trilha sem o e-mail de operador (`:66-76`) e objetos do bucket, com teto de 5000 por bloco declarado como `truncated` (`:20`, `:118-126`). O navegador anexa a escolha de cookies, que só existe no cookie (`useAccountDataRights.tsx:23-36`). SDK em `packages/sdk/src/actions/account/action.ts:51`; botão em `AccountPrivacyPanel.tsx:83-103`. `lastAccessAt` sai no arquivo, coberto em `apps/api/__tests__/accountExportRoute.test.ts:203` |
| 2. O titular solicita a exclusão da própria conta, com confirmação explícita e resultado visível | **implementado** | `POST /account/deletion` sob `requireCommonPanelApi` (`apps/api/app/(routes)/account/deletion/route.ts:19`), com senha digitada de novo em vez de confiar na idade da sessão (`:55-72`) e recusa quando sujeito e ator divergem (`:23-28`). Diálogo destrutivo em `AccountPrivacyPanel.tsx:123-171`; ao concluir, aviso e saída da sessão (`useAccountDataRights.tsx:61-71`). SDK em `action.ts:67` |
| 3. Exclusão coordenada, sem órfãos, com retenção justificada | **implementado**, com uma metade não verificável e outra transferida | Seis passos nomeados em `apps/api/(shared)/lib/account-erasure.ts:89-121`, a conta de Auth por último (`:104-107`). Registros apagados de verdade, inclusive os já arquivados (`entity.repository.ts:62-66` sobre `base.repository.ts:243-262`); perfil apagado (`user.repository.ts:60-61`), o que leva `lastAccessAt` junto; trilha retida com o rótulo do titular anonimizado (`audit-event.repository.ts:149`). **Arquivos:** varredura por prefixo de dono (`account-erasure.ts:53-65`, `storage.ts:103`), que responde `skipped` sem bucket configurado e nunca rodou contra Cloud Storage real. **Assinatura:** ponto de extensão que responde `skipped` com `billing-not-linked` (`account-erasure.ts:67-78`), porque não existe vínculo perfil↔cliente Stripe. A obrigação passou para [`billing-subscription`](../billing-subscription/spec.md), que é quem cria esse vínculo |
| 4. A resposta declara o prazo aplicável, nos 3 idiomas | **implementado** | 15 dias, a recomendação da própria spec: `translations/apps/app/pages/common/account.ts:87-88` (pt-br), `:213-214` (en), `:340-341` (es), e na política em `translations/apps/web/pages/legal/index.ts:57`, `:117`, `:177` |
| 5. Canal de privacidade publicado, com conteúdo real no lugar do placeholder | **implementado**, com deriva | `NEXT_PUBLIC_PRIVACY_CONTACT` (`apps/web/env.ts:19,27`, `apps/web/.env.example:63`) vira `mailto:`; vazia, o canal cai no formulário de contato (`apps/web/shared/lib/privacyContact.ts:10-19`). A página de privacidade publica o canal (`apps/web/app/[locale]/legal/privacy/page.tsx:16-31`) e a política ganhou as seções de cookies e de direitos nos 3 idiomas (`legal/index.ts:51-58` em pt-br). Ver a deriva abaixo |

Cobertura: `accountExportRoute.test.ts`, `accountDeletionRoute.test.ts`, `accountErasure.test.ts` e
`auditTrailAnonymization.test.ts` na `apps/api`, mais o crescimento de `baseRepository.test.ts`;
`accountPrivacyPanel.test.tsx`, `useAccountDataRights.test.tsx`, `accountDeletionSchema.test.ts` e
`downloadJsonFile.test.ts` na `apps/app`; `privacyContact.test.ts` na `apps/web`; `legalSections.test.ts` no
pacote de tradução. O `/test` rodou o expurgo contra o emulador de Auth e Firestore e provou o recadastro
com o mesmo e-mail depois da exclusão (`test/report.md`).

**Por que a spec fecha com o item 3 dividido.** A própria spec previa isto nos riscos: "quem entregar por
último paga a integração — daí a exclusão nascer com pontos de extensão". O ponto de extensão de cobrança
existe, é visível no relatório de cada exclusão e tem dono. Manter a spec aberta por ele criaria o mesmo
estado absorvente que `user-activity-tracking` evitou ao transferir o item 4 para esta spec: ela só
fecharia quando `billing-subscription` entregasse.

## Deriva de implementação

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "Conteúdo real substituindo o placeholder de aviso de privacidade e termos" | A política continua modelo, com o aviso "Este é um modelo do boilerplate" mantido nos 3 idiomas (`legal/index.ts:40`, `:100`, `:160`), mas passou a declarar os cookies que o código grava e os direitos que o produto oferece. Os termos não mudaram | **A spec estava errada.** O core não tem como escrever o texto legal de cada fork, e o próprio backlog já dizia isso na decisão sobre quem escreve a política. O que cabe ao core é um modelo que não minta sobre o código, e isso foi entregue |
| Exportação e exclusão "sem pedir nada a ninguém" | O titular que entrou só com Google não tem senha para reconfirmar, e a rota recusa a exclusão com `ACCOUNT_DELETION_REAUTH_UNSUPPORTED` (`deletion/route.ts:48-53`); a tela troca o botão pelo aviso de usar o canal de privacidade (`AccountPrivacyPanel.tsx:40-48`, `:106-114`) | **A implementação restringiu, de propósito.** Reautenticar conta federada exige outro fluxo. O canal publicado no item 5 cobre o caso, mas é pedido a alguém, não autoatendimento |
| Soft delete do admin como armadilha a remover | O `DELETE` administrativo continua sendo soft delete e virou **Arquivar** na tela (`UsersListClient.tsx`, `action-menu.tsx`), para não se confundir com o interruptor "Ativo/Desativado" do Firebase Auth | **Escolha deliberada, pedida pelo usuário.** O expurgo real existe só no caminho do titular |
| `contends_on`: `base.repository.ts`, `packages/auth/server.ts`, `firestore.indexes.json` | Tocou `base.repository.ts`; **não** tocou `packages/auth/server.ts` nem `firestore.indexes.json` (nenhum índice novo, de propósito). Tocou, sem declarar, `entity.repository.ts`, `user.repository.ts`, `audit-event.repository.ts`, `storage.ts`, `apps/api/proxy.ts`, `(common)/routes.tsx`, `(common)/paths.ts`, `Footer.tsx`, `PageFormFooter.tsx`, `action-menu.tsx` e `apps/web/env.ts` | **Previsão errada nas duas direções.** Dois dos três declarados sobraram; os repositórios vizinhos faltaram, de novo |
