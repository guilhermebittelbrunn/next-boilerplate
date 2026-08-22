# Relatório de QA — `impersonation-read-only`

**Veredito: aprovado.** 23 critérios de aceite, nenhum falhou. Nenhum bloqueio.

Branch `api/fix/impersonation-read-only`. Escopo lido em `git diff origin/main...HEAD` (14 commits,
55 arquivos) — a árvore estava limpa, então `git diff` simples não serve para localizar o diff desta
feature.

## 1. Comandos

| Comando | Resultado |
|---|---|
| `pnpm --filter api test` | ✅ **56** (baseline 45) |
| `pnpm --filter app test` | ✅ **135** (baseline 126) |
| `pnpm --filter @repo/internationalization test` | ✅ 2 |
| `pnpm test` (root, sem cache) | ✅ 3/3 tasks — **193 testes** |
| `pnpm --filter api typecheck` · `app` · `web` | ✅ ✅ ✅ |
| `pnpm check` | 197 erros / 39 avisos — **idêntico à baseline**; os 3 arquivos novos entram com zero dívida |

Baseline de 173 confirmada antes de qualquer alteração. Total final **193** (+20).

## 2. Testes criados

Nenhum foi commitado — ficam no working tree para o `/review`.

| Arquivo | Casos | O que trava |
|---|---|---|
| `apps/api/__tests__/entitiesRouteImpersonation.test.ts` | 11 | Rotas reais de `entities` com o guard **real** (só repositório e ator mockados): `GET` passa; `POST`/`PUT`/`DELETE`/toggle → 403 **sem escrita**; a recusa acontece **antes** de validar o corpo; bloco do titular com 201/200/204 e ownership de terceiro → 404 |
| `apps/app/__tests__/impersonationReadOnlyNotice.test.tsx` | 4 | Aviso isolado: ausente do DOM fora da impersonação (verificado no DOM, não por CSS), live region, uid truncado, e o caso sem uid nem rótulo que não pode imprimir `null` |
| `apps/app/__tests__/entityFormsReadOnly.test.tsx` | 5 | `create/page.tsx` e `EditEntityClient.tsx`, que não tinham teste algum |

**Verificados por mutação.** Remover a chamada do helper em `common-panel.ts` derruba 5 dos 11 casos de
rota; remover `disabled={isImpersonating}` de `create/page.tsx` derruba o caso correspondente. Código de
produção restaurado nos dois casos.

### Lacuna deliberada

`create-dev-admin.mjs` não recebeu teste automatizado. É script de bootstrap fora do runtime: um teste
teria de mockar toda a superfície de `firebase-admin` e afirmaria que *o mock* foi chamado — não que a
senha é de fato redefinida, que é o único risco real. Esse risco foi coberto por execução: o script rodou
contra o projeto de DEV, imprimiu `already existed, password reset`, e a senha nova autenticou no browser.

## 3. Critérios de aceite — 23/23 PASS

Detalhe por item em [`criterios-aceite.md`](criterios-aceite.md).

- **A. Autorização (A1–A10)** — leitura liberada · mutação 403 sem escrita · recusa antes do corpo ·
  mesmo código nos dois guards · admin no painel admin intacto · titular sem restrição · sem headers →
  `COMMON_PANEL_FORBIDDEN` · ownership → 404 · 401 · varredura de guards.
- **B. UI (B1–B6)** — 5 afordâncias suprimidas · aviso nomeando o usuário · uid truncado nunca `null` ·
  ausente do DOM fora da impersonação · **afordâncias voltam ao sair** · light+dark+mobile.
- **C. Copy de erro (C1–C7)** — 403 traduzido nos 3 idiomas · sign-in/sign-up não regrediram · falha de
  transporte não vira copy de interface · paridade i18n · `apps/web` compila.

## 4. Validação executável

15 screenshots em [`e2e/`](e2e/), light+dark em 1280×900 e 390×844. Contra o projeto Firebase de DEV, com
escrita autorizada pelo usuário.

O que estas rodadas provaram e as anteriores não cobriam:

- **`es` — a lacuna do terceiro idioma, fechada.** `POST /entities` sob impersonação → toast
  *"Solo lectura: estás actuando como otro usuario."* (`05-impersonating-403-toast-es.png`). pt-br e en
  reconfirmados na mesma rodada.
- **Caminho feliz do titular, ponta a ponta, com o dado mudando na tela.** Usuário comum novo → criar
  (`POST` 201, linha aparece) → toggle (`PUT` 200) → editar (`PUT` 200, lista mostra o nome novo) →
  excluir via popconfirm (`DELETE` 204, volta ao estado vazio). Sem regressão.
- **Admin no painel admin não foi afetado.** `PUT /users/<id>` responde 200 agindo como ele mesmo.
- **Transição completa.** Entrar na impersonação → afordâncias somem → sair → voltam, sem reload.
- Após **5** tentativas de bypass forçando o submit, a lista do alvo seguia com as 2 entidades originais.

## 5. Estado deixado no ambiente de DEV

- `readonly-check@example.com`: `enabled` alternado e **revertido** (conferido `enabled=true`).
- `qa-happypath@example.com`: criado para o roteiro e **excluído** pelo painel admin, junto da entidade.
- Senha do `dev-admin@example.com` redefinida na hora e descartada ao final — não está em arquivo,
  print ou artefato.

⚠️ **Resíduo conhecido**: a exclusão pelo painel remove o perfil no Firestore, mas a credencial de
`qa-happypath@example.com` provavelmente segue no Firebase Auth — não há UI para apagá-la. É o mesmo
comportamento que o `BACKLOG.md` já registra para o soft delete herdado. Sem impacto funcional.

## 6. Cross-check e follow-ups

O que **não** foi coberto, sem fingir cobertura:

1. **`apps/web` teve apenas smoke** (typecheck + landing renderiza). É a superfície menos exercitada do
   diff: a correção da copy de erro tocou `packages/sdk` e `packages/shared`, que a `web` consome — ainda
   que não consuma *erro* do SDK. Risco baixo, mas é a ponta solta.
2. **A7 (admin sem headers → `COMMON_PANEL_FORBIDDEN`) só tem teste, não e2e.** Não há caminho pela UI
   para ficar no painel comum sem usuário selecionado; o seletor escolhe um automaticamente. Provar pela
   interface exigiria forjar headers.
3. **`apps/email` não foi subido** — não consome o SDK.
4. **Modo de produto (`subscription` × `simple`) não variado** — nenhum ponto do diff lê essa flag.
5. **Assimetria de desenho, conhecida e aceita**: a API é fail-safe por construção (o teste de varredura
   de guards, A10, cobre guard novo); a **UI é por disciplina**. Se um fork criar uma tela comum com ação
   mutante, suprimir a afordância é manual. Hoje só `entities` tem ações mutantes na área comum.
6. **Nit do `/review` não corrigido**: "Excluir" *some* do menu enquanto as demais afordâncias ficam
   `disabled` — tratamento diferente para o mesmo motivo. Se for uniformizar, é aqui.
7. **`hydration mismatch` do `PanelNavbarControls`** reconfirmado no console. Pré-existente, já
   catalogado no `specs/BACKLOG.md`.
