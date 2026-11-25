# Backlog

A fila do que vamos desenvolver, em uma página. Cada linha aponta para a spec em [`features/`](features/), e toda spec
abre com um bloco **Resumo** (o quê, por quê, status e próximo passo). Como a pasta funciona: [`README.md`](README.md).
A evidência por trás desta fila (conferência de entregas, gates, achados, deriva) está no
[registro de auditoria](reference/AUDIT.md).

**Situação em 2026-11-25:** 3 `approved` · 2 `proposed` · 2 `in-progress` · 2 `deferred` · 37 entregues.
Última auditoria: 2026-11-24, sobre `c58f2ef` (PR #74).

## Ordem recomendada

O que está aprovado e pronto para começar. Comece pela primeira; as três não disputam os mesmos arquivos, então
podem rodar em paralelo, cada uma na sua branch.

| # | spec | o quê | valor · esforço | para começar |
|---|------|-------|-----------------|--------------|
| 1 | [`admin-own-account`](features/admin-own-account.md) | Área de conta para o admin trocar senha, avatar, tema e idioma | médio · M | `/analyze admin-own-account` |
| 2 | [`app-form-layout-centered`](features/app-form-layout-centered.md) | Revisar as telas de formulário do app: centralizar e tirar o card esticado até o rodapé | médio · P | `/analyze app-form-layout-centered` |
| 3 | [`audit-log-levels`](features/audit-log-levels.md) | Nível na trilha de auditoria (sensível × informativo), eventos informativos (cadastro, assinatura, cancelamento) e filtro por nível | médio · M | `/analyze audit-log-levels` |

## Aguardando triagem

Specs escritas que ainda precisam do seu "sim" (ou "não") antes de entrar na fila.

| spec | o quê | o que falta decidir |
|------|-------|---------------------|
| [`signup-email-verification`](features/signup-email-verification.md) | Código por e-mail no cadastro antes de liberar o painel, quando o e-mail estiver configurado | se o código vale só no cadastro ou também em todo login |
| [`international-billing`](features/international-billing.md) | Cobrança para outros países, desligada por padrão: formas de pagamento assíncronas (boleto e Pix), o mesmo plano em várias moedas e imposto pela Stripe Tax | a ordem das fatias (recomendado: pagamentos, moedas, impostos) e se a fatia de impostos entra, já que a Stripe Tax não atende empresa no Brasil |

## Em andamento

Começadas, com parte entregue, e paradas esperando uma decisão sua.

| spec | entregue | o que trava |
|------|----------|-------------|
| [`account-security-mfa`](features/account-security-mfa.md) | política de senha e sessões ativas (4 de 6 itens) | o segundo fator: fechar esta spec e abrir uma só dele? (recomendado) |
| [`observability-logging`](features/observability-logging.md) | trilha, ID por requisição e prontidão (5 de 6) | o coletor de erros exige conta num provedor: fechar esta spec e abrir uma pequena só do coletor? (recomendado) |

## Adiadas

| spec | por quê | volta quando |
|------|---------|--------------|
| [`one-time-purchase`](features/one-time-purchase.md) | mexe em todo o núcleo de cobrança e nenhum fork pediu | um fork precisar cobrar uma vez |
| [`social-sign-in-providers`](features/social-sign-in-providers.md) | nenhum fork pediu GitHub ou Microsoft | um fork pedir um desses provedores |

## Tarefas diretas

Correções pequenas que não precisam de spec. As próximas da fila; a lista completa, com a evidência de cada uma,
está em [Tarefas diretas candidatas](reference/AUDIT.md#tarefas-diretas-candidatas).

1. Marcar o JWT fictício `LEAKY_TOKEN` como falso positivo do Gitleaks, para o job `secrets` do CI voltar ao verde.
2. Consertar o `pnpm --filter email build`, quebrado pelo `motion-dom` (pode se resolver com o merge da PR #68 do
   Dependabot).
3. Acrescentar ao `.github/dependabot.yml` um `ignore` de versão maior do `stripe`.
4. Corrigir o que deixa vermelhas as PRs #66, #67 e #70 do Dependabot, uma tarefa por PR.
5. Fazer os quatro chamadores que ainda engolem a falha da revogação de sessão responderem erro.

## Precisam de decisão

| # | pergunta | recomendação |
|---|----------|--------------|
| E12 | O que fazer com o segundo fator de `account-security-mfa`? | fechar a spec como entregue e abrir uma só do segundo fator |
| E1 | Fechar `observability-logging` e abrir uma spec pequena só do coletor de erros? | sim |
| E3 | Ligar branch protection na `main`, exigindo `verify`, `e2e`, `secrets` e `audit` | sim; é configuração sua no GitHub |
| D9 | Na compra avulsa, o estorno feito na Stripe retira o acesso? | sim, quando `one-time-purchase` voltar da fila |

As demais decisões estacionadas estão em [Decisões estacionadas](reference/AUDIT.md#decisões-estacionadas-51).

## Entregues

<details>
<summary>37 specs entregues e arquivadas junto da feature que as implementou</summary>

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [spec](../docs/features/firestore-admin-access/spec.md) |
| `ci-pipeline` | 2026-09-01 | [spec](../docs/features/ci-pipeline/spec.md) |
| `api-hardening` | 2026-09-09 | [spec](../docs/features/api-hardening/spec.md) |
| `transactional-emails` | 2026-09-10 | [spec](../docs/features/transactional-emails/spec.md) |
| `auth-recovery-verification` | 2026-09-11 | [spec](../docs/features/auth-recovery-verification/spec.md) |
| `file-upload-storage` | 2026-09-14 | [spec](../docs/features/file-upload-storage/spec.md) |
| `account-settings` | 2026-09-15 | [spec](../docs/features/account-settings/spec.md) |
| `firebase-emulator-seed` | 2026-09-15 | [spec](../docs/features/firebase-emulator-seed/spec.md) |
| `cookie-consent` | 2026-09-16 | [spec](../docs/features/cookie-consent/spec.md) |
| `cursor-pagination` | 2026-09-16 | [spec](../docs/features/cursor-pagination/spec.md) |
| `audit-log` | 2026-09-17 | [spec](../docs/features/audit-log/spec.md) |
| `dashboard-home` | 2026-09-17 | [spec](../docs/features/dashboard-home/spec.md) |
| `session-refresh` | 2026-09-17 | [spec](../docs/features/session-refresh/spec.md) |
| `user-activity-tracking` | 2026-09-19 | [spec](../docs/features/user-activity-tracking/spec.md) |
| `admin-analytics-dashboard` | 2026-09-23 | [spec](../docs/features/admin-analytics-dashboard/spec.md) |
| `data-rights-lgpd` | 2026-09-23 | [spec](../docs/features/data-rights-lgpd/spec.md) |
| `onboarding-flow` | 2026-09-24 | [spec](../docs/features/onboarding-flow/spec.md) |
| `billing-subscription` | 2026-09-25 | [spec](../docs/features/billing-subscription/spec.md) |
| `admin-billing-insights` | 2026-09-25 | [spec](../docs/features/admin-billing-insights/spec.md) |
| `e2e-testing` | 2026-09-25 | [spec](../docs/features/e2e-testing/spec.md) |
| `brand-config` | 2026-09-28 | [spec](../docs/features/brand-config/spec.md) |
| `storage-emulator-rules-tests` | 2026-09-28 | [spec](../docs/features/storage-emulator-rules-tests/spec.md) |
| `accessibility-conformance` | 2026-09-29 | [spec](../docs/features/accessibility-conformance/spec.md) |
| `account-email-change` | 2026-09-29 | [spec](../docs/features/account-email-change/spec.md) |
| `compliance-docs-kit` | 2026-09-30 | [spec](../docs/features/compliance-docs-kit/spec.md) |
| `plan-entitlements` | 2026-10-04 | [spec](../docs/features/plan-entitlements/spec.md) |
| `pricing-page-catalog` | 2026-10-16 | [spec](../docs/features/pricing-page-catalog/spec.md) |
| `linked-sign-in-methods` | 2026-10-19 | [spec](../docs/features/linked-sign-in-methods/spec.md) |
| `contact-support-channel` | 2026-10-19 | [spec](../docs/features/contact-support-channel/spec.md) |
| `in-app-notifications` | 2026-10-20 | [spec](../docs/features/in-app-notifications/spec.md) |
| `magic-link-sign-in` | 2026-10-22 | [spec](../docs/features/magic-link-sign-in/spec.md) |
| `teams-organizations` | 2026-10-23 | [spec](../docs/features/teams-organizations/spec.md) |
| `organization-ownership-transfer` | 2026-10-28 | [spec](../docs/features/organization-ownership-transfer/spec.md) |
| `app-internal-ux-polish` | 2026-11-19 | [spec](../docs/features/app-internal-ux-polish/spec.md) |
| `delivery-infra-hardening` | 2026-11-23 | [spec](../docs/features/delivery-infra-hardening/spec.md) |
| `delivery-product-quality` | 2026-11-24 | [spec](../docs/features/delivery-product-quality/spec.md) |
| `delivery-security-review` | 2026-11-24 | [spec](../docs/features/delivery-security-review/spec.md) |

O detalhe de cada entrega (itens do corte, PRs, resultado do `/test`, derivas e passos manuais por fork) está em
[Entregues no registro de auditoria](reference/AUDIT.md#entregues).

</details>
