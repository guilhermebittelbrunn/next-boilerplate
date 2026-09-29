---
id: accessibility-conformance
title: "Acessibilidade: allowlist do axe zerada e testes no design system"
status: in-progress
value: alto
effort: M
audience: confianca
area: [packages/design-system, apps/app, apps/web, apps/e2e, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/design-system/components/ui/form.tsx, packages/design-system/components/ui/button.tsx, packages/design-system/styles/globals.css, packages/design-system/package.json, apps/e2e/a11y/allowlist.ts]
feature: accessibility-conformance
updated: 2026-09-29
---

# Acessibilidade: allowlist do axe zerada e testes no design system

## Problema

A suíte E2E roda o axe em toda PR, mas tolera sete grupos de violação graves pela allowlist: botão de mostrar
senha sem nome, `Select` e `Switch` sem nome nas telas do painel, páginas do painel sem `<title>`, iniciais do
avatar e cards da landing com contraste insuficiente no tema claro, e `Link` dentro de `Button` na web. Fora do
alcance do axe há defeitos que atingem todos os formulários: quem usa leitor de tela não ouve a mensagem de
erro de campo, o botão em carregamento perde o nome e a cor de erro do tema escuro fica em 1,97:1.

Todos moram no design system ou nos layouts compartilhados, então todo fork herda cada um deles. E o design
system é o único pacote com componentes de UI que não tem task de teste: nenhum desses defeitos quebraria um
teste se voltasse.

## O que já existe no repo

- `apps/e2e/a11y/allowlist.ts:23-65` define as sete exceções e `:83-107` as aplica por rota. Cada uma traz no
  `reason` o conserto esperado. A anotação `a11y-stale-exception` avisa quando uma exceção deixa de casar.
- `packages/design-system/components/ui/form.tsx:109-126` (`FormControl`) põe `aria-invalid` e
  `aria-describedby` a partir do `useFormField`, que só acha o erro dentro do `FormField`. Dos oito
  componentes de `components/form/hookform/`, sete usam `<Controller>` direto e passam o erro por prop
  (`hookformInput.tsx:66-76`). Três deles (`hookformInput`, `hookformInputPassword`, `hookformSelect`) usam
  `FormControl` e saem com `aria-invalid="false"` e sem o id da mensagem ao lado de um erro visível; os outros
  quatro (`hookformDateInput`, `hookformImageUpload`, `hookformRadioGroup`, `hookformTextarea`) não usam
  `FormControl` e saem **sem** `aria-invalid`. O `hookformSwitch` já usa `FormField` (`:49`) e fica fora do
  defeito. *(Correção da auditoria de 2026-09-27: a versão anterior tratava os oito como iguais.)*
- `packages/design-system/components/ui/button.tsx:72-73` troca o conteúdo pelo `Spinner` quando `loading`;
  o `Spinner` tem `aria-label="Loading"` literal (`ui/spinner.tsx:8-9`). O botão fica sem nome traduzido
  durante o carregamento.
- `packages/design-system/styles/globals.css:63` (`--destructive` do escuro, 1,97:1 como texto). O mesmo token
  chega ao antd como `colorError` (`packages/design-system/providers/antd-app.tsx:20`); o código do repo só o
  usa como cor de texto do item `danger` (`antd-app.tsx:66-68`), com fundo `--color-accent` (`:69-70`). Se o
  estilo padrão do antd pinta o hover do item `danger` com `colorError` de fundo e texto branco, clarear só o
  token desloca o problema; isso **não** está no código do repo e precisa ser medido no `/test`.
- `packages/design-system/components/ui/action-menu.tsx:103-110`: o gatilho do menu de ações é um `<div>` sem
  papel nem nome e não recebe foco pelo teclado.
- `packages/design-system/package.json:5-8`: scripts `clean` e `typecheck`, sem `test` e sem config de Vitest.
  Têm os dois `analytics`, `auth`, `email`, `internationalization`, `payments`, `security` e `shared`;
  `packages/sdk` (`package.json:15-17`), `seo` e `next-config` também não têm `test`.
- Achados já registrados no `BACKLOG.md` e absorvidos por esta spec: `aria-invalid` dos `HookForm*`, `Button`
  com `loading`, contraste do `--destructive`, gatilho do `ActionsMenu`, os sete grupos da allowlist e a task
  de teste do design system.
- `apps/app/shared/components/ui/ProfileDropdown.tsx:45`: `<AvatarImage src={avatarSrc} />` sem `alt`. Com
  avatar enviado, o axe acusa `image-alt` (serious) em toda página autenticada (medido pelo `/test` de
  `storage-emulator-rules-tests` em 2026-09-28). A suíte E2E não vê porque o usuário do seed não tem avatar, e
  o caso não está no corte abaixo, que fala de controles sem nome. O gatilho do menu já tem `aria-label`
  (`:42`), então a correção provável é `alt=""`. *(Acrescentado pela auditoria de 2026-09-29; o corte não
  mudou.)*
- **Lacuna:** nenhuma das exceções saiu desde a PR #26, exceto a parte do header da web consertada na PR #28;
  nenhum teste de componente protege o que for consertado.

### Por que reabrir uma lacuna descartada

"Task de teste no `@repo/design-system`" ficou nas lacunas como "não é spec, é achado". O argumento novo é
que ela deixou de ser um achado isolado: são seis defeitos de acessibilidade no mesmo pacote, a allowlist
existe para encolher e segue com as sete exceções três PRs depois da que a criou, e cada conserto sem teste
pode voltar sem ninguém ver. Juntos eles têm um sinal de pronto observável, a allowlist vazia nas rotas
cobertas, que nenhum achado sozinho tem.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md), controle 18, e
  [`research/engineering-baseline.md`](research/engineering-baseline.md), prática 17.
- Natureza da obrigação: **lei**. A LBI (Lei 13.146/2015), art. 63, torna "obrigatória a acessibilidade nos
  sítios da internet mantidos por empresas com sede ou representação comercial no País"; a norma técnica é
  aberta, e a referência internacional é o WCAG 2.2 AA. Para fork que vende a consumidor na UE, o European
  Accessibility Act se aplica desde 28/06/2025 e só isenta microempresa de serviços.
- A prática 17 registra que o axe pega entre 30% e 40% dos problemas reais e que o que quebra costuma ser o
  wrapper do time, não o primitivo Radix/shadcn. É o caso aqui: os defeitos estão nos `HookForm*`, no
  `Button` e no `ActionsMenu`, não nos primitivos.
- A mesma prática recomenda começar com allowlist para não travar o repo no primeiro dia. O primeiro dia foi
  a PR #26, em 2026-09-25.

## Proposta — corte de MVP

- [ ] Erro de campo anunciado: todo `HookForm*` publica `aria-invalid` e liga o campo à mensagem quando há
      erro, e só então.
- [ ] Nenhum controle sem nome nas rotas cobertas pela suíte: botão de mostrar senha, `Select` do navbar e do
      filtro de usuários, `Switch` das linhas das tabelas, gatilho do `ActionsMenu` (que também passa a
      receber foco pelo teclado) e `Button` em carregamento. Os nomes vêm do dicionário, nos 3 idiomas.
- [ ] Páginas do painel com `<title>` traduzido.
- [ ] Contraste AA como texto nas mensagens de erro do escuro, nas iniciais do avatar e nos cards da landing no
      claro, sem quebrar o fundo do item `danger` do antd.
- [ ] A allowlist fica vazia, ou cada exceção restante tem justificativa escrita que não seja "falta
      consertar".
- [ ] `@repo/design-system` ganha task de `test` no turbo, com testes de componente que falham se os
      consertos acima regredirem.

### Fora do corte

- Declaração pública de acessibilidade e o símbolo do § 1º do art. 63 da LBI. São conteúdo do fork.
- Auditoria manual com leitor de tela e teclado de todas as telas. O `/test` percorre os fluxos, mas a spec
  não promete conformidade WCAG completa; o axe cobre uma fração.
- Rodar o axe em `/en` e `/es`. Hoje a suíte cobre as rotas em pt-br; ampliar é barato depois que a allowlist
  zerar.
- O `DateInput` com `"Pick a date"` literal e formatação sempre em inglês: é defeito de i18n, fica como achado.
- O `<html lang>` vindo do cookie: pertence ao achado do `getDictionary()` do servidor.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum. |
| `apps/app` | Títulos das páginas do painel; nomes dos `Select` e `Switch` passados pelos call sites. |
| `apps/web` | O mesmo padrão de `Link` fora de `Button` no hero, CTA, FAQ e preços; contraste dos cards. |
| `packages/*` | `design-system` concentra a mudança e ganha testes; i18n para os nomes acessíveis. |
| Infra/env | Nenhuma variável. `apps/e2e/a11y/allowlist.ts` perde as exceções. |

## Riscos e trade-offs

- **Token de cor compartilhado.** O `--destructive` é texto num lugar e fundo em outro. A solução provável é
  separar a cor de texto de erro do token de fundo, e ela mexe no tema de todo fork.
- **Mudança visual em todos os forks.** Contraste e foco visível alteram a aparência; forks que customizaram o
  tema precisam conferir o próprio.
- **Escopo pode crescer.** Consertar o `Link` dentro de `Button` na web é o mesmo padrão em quatro seções. Se o
  `/analyze` achar mais ocorrências, elas entram; componente novo fora das rotas cobertas não entra.
- Custo em dinheiro: zero. Dependência nova, no máximo a de teste de componente no design system.

## Sinais de pronto

- `pnpm e2e` passa com a allowlist vazia nas rotas cobertas.
- Com leitor de tela, um campo com erro anuncia a mensagem.
- O botão de checkout em carregamento mantém o nome.
- Reverter qualquer um dos consertos no design system quebra um teste do próprio pacote.

## Perguntas em aberto

- Aceitar exceção residual justificada ou exigir allowlist vazia? — **recomendação:** vazia nas rotas
  cobertas; exceção só para defeito de biblioteca externa, com link para o problema na origem.
- Usar uma lib de axe nos testes de componente do design system? — **recomendação:** não no MVP; afirmar o
  atributo e o nome com Testing Library basta e evita dependência nova.
