---
slug: delivery-product-quality-slice-3
title: "Core aprovado na parte 3 da entrega, fatia 3 (títulos e conversão)"
task: -
spec: delivery-product-quality
branch: -
epic: -
updated: 2026-11-23 19:31
---

# Pipeline — Core aprovado na parte 3 da entrega, fatia 3 (títulos e conversão)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-23 18:02 | analyze/plan.md | Fatia 3 da spec em dois itens: `title.template` (`"%s \| <marca>"`) nos layouts comum e admin, com as 10 telas internas titulando pelo registro `PANEL_PAGE_TITLES` a partir de rótulos de rota que já existem (zero chave nova; `layout.tsx` irmão nas 4 telas cliente); `useAnalyticsEvent()` no `@repo/analytics`, alimentado pelo `AnalyticsProvider` e mudo sem consentimento ou sem id do GA, com `sign_up` em seis pontos (cadastro por e-mail na app e na landing, Google com `isNewUser` do popup nas quatro telas) e `generate_lead` no contato aceito. Zero dependência e zero env nova. 12 decisões tomadas por padrão (Q1 a Q12) |
| develop | done    | 2026-11-23 18:27 | develop/handoff.md | Títulos do painel com `title.template` e `PANEL_PAGE_TITLES` (10 telas, 4 `layout.tsx` irmãos); `useAnalyticsEvent()` no `@repo/analytics` com `sign_up` nos seis pontos e `generate_lead` no contato, mudos sem consentimento ou sem id do GA. Dois desvios por corrida de navegação: na app o `sign_up` do Google sai logo após o popup; no cadastro da landing, `mutateAsync`. Item 19 no `PRE-PRODUCTION.md`. Gates: `pnpm check`, typecheck de 5 workspaces, build da app, testes `app` 1273, `web` 306, `analytics` 41, `auth` 142 |
| review  | done    | 2026-11-23 18:35 | review/review.md | Sem bloqueante. Dois 🟡 corrigidos: o comentário do Google no cadastro da landing justificava o `mutateAsync` com um motivo falso (o observador da mutation é do `AuthProvider`, que não desmonta; o código segue correto), e o `panelTitles.test.ts` reprovava a chamada quebrada em várias linhas pelo Biome (agora ignora a formatação; medido com duas sondas). Desvio 1 aceito: as duas apps contam conta criada. Branch atual inválida no regex; proposta `feat/delivery-product-quality-slice-3`, não criada por causa do Conductor. Gates: `pnpm check` 1112 arquivos, typecheck `app` e `web`. Plano de 10 commits |
| test    | done    | 2026-11-23 19:31 | test/report.md, test/criterios-aceite.md | 14 ✅, 0 ❌, 1 🔒 (propriedade GA4 real). No navegador, `sign_up` sobrevive ao `window.location.replace` nas duas telas da app (Google e e-mail), sai depois da navegação do cliente no cadastro da landing, não sai com o banner recusado ou sem decisão nem no login seguinte do Google; `generate_lead` só no envio aceito; títulos das 12 telas conferidos nos 3 idiomas e com personificação; sem id do GA nada quebra (app em build de produção). Gates: `pnpm test` da raiz 15/15 (`app` 1273, `web` 306, `analytics` 41, `auth` 142, i18n 67), E2E `entityCrud` `chromium` + `mobile` verdes. Nenhum teste novo. O harness do subagent recusou gravar o `report.md`; o orquestrador gravou o conteúdo devolvido, sem alteração |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-product-quality.md` (`status: approved`), **só a fatia 3** (linhas 190-194). As fatias 1 e 2
  foram entregues pelas PRs #71 e #72 e têm o pipeline em `docs/features/delivery-product-quality/` e
  `docs/features/delivery-product-quality-slice-2/`. O "Fora do corte" fica fora. Não editar a spec: arquivá-la é
  do `/spec --sync`, e esta fatia fecha o corte.
- Pasta própria, como na fatia 2, porque os `STATE.md` anteriores estão fechados. O `spec:` do frontmatter liga as
  três.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md` → "Perguntas em
  aberto (decididas por padrão)". Q3 (Vercel Analytics) e Q6 (área no título) são as que pedem revisão.

### Para o `/develop`

- O `sign_up` não pode nascer no `AuthProvider`: na landing ele fica acima do `AnalyticsProvider`
  (`apps/web/app/[locale]/layout.tsx:41-42`). O disparo fica nos formulários (`plan.md` §5.2).
- O `isNewUser` vem do popup, no cliente. O da resposta do Identity Toolkit chega falso porque o popup já criou a
  conta.
- No `provider.tsx`, `measuring` e o `useCallback` do `trackEvent` sobem para antes do retorno antecipado.
- Escrever o item 19 do `docs/PRE-PRODUCTION.md` (eventos principais no GA4).

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Propriedade GA4 real e `NEXT_PUBLIC_GA_MEASUREMENT_ID` nos projetos `web` e `app` para ver o evento chegar.
- Marcar `sign_up` e `generate_lead` como eventos principais no GA4.
- `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e Resend para o contato em produção; o `/test` simula a resposta da API.

### Para o `/test`

- Roteiro V1 a V10 em `analyze/plan.md` §8. Sem passada de tema e celular: a fatia não muda nada visível.
- Bloquear `googletagmanager.com` e `google-analytics.com` com `network route --abort`; a prova é o
  `window.dataLayer`. O id do GA dos `.env` locais pode ser de uma propriedade real.
- Contas de QA: `qa-dpq3-*@example.com` e as contas Google do emulador. Listar no `report.md` para limpeza.
