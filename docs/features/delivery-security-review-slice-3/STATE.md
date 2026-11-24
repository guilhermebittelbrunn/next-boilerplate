---
slug: delivery-security-review-slice-3
title: "Core aprovado na parte 1 da entrega, fatia 3 (arestas)"
task: -
spec: delivery-security-review
branch: feat/delivery-security-hardening
epic: -
updated: 2026-11-24 01:50
---

# Pipeline — Core aprovado na parte 1 da entrega, fatia 3 (arestas)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-24 00:48 | analyze/plan.md | Fatia 3 em quatro itens: foto e avatar aceitam só objeto do bucket ou `https://lh3.googleusercontent.com` (o host da CSP), com o avatar reenviado sem mudança ainda aceito; o upload conta os bytes ao ler e recusa acima do teto sem `content-length` (413 com `connection: close`), e grava JPEG, PNG e WebP sem metadados por código próprio, mantendo ICC e a orientação do JPEG; o cadastro da landing trava os dois botões com um estado só; `components/sign-in.tsx` sai de `@repo/auth` e `@repo/email` ganha `server-only`. Zero dependência, zero env, zero código de erro novo. 13 decisões tomadas por padrão (Q1 a Q13); `sharp` fica como alternativa no relatório |
| develop | done    | 2026-11-24 01:09 | develop/handoff.md | Allowlist `lh3` na foto e no avatar (reenvio sem mudança aceito), upload com teto contado na leitura e 413 com `connection: close`, remoção de metadados própria para JPEG/PNG/WebP, trava única no cadastro da landing, `sign-in.tsx` removido, `server-only` em `@repo/email`. Suíte 14/14 (`api` 1810), `pnpm check` e typecheck verdes, `api build` verde; `email build` já quebrava antes (motion-dom). 6 desvios registrados |
| review  | done    | 2026-11-24 01:50 | review/review.md | Nenhum bloqueante. Parser de metadados medido com 15 entradas hostis (tamanho 0, offset enorme, chunk PNG de 4 GiB, RIFF mentiroso): nenhuma exceção nem laço infinito; pior caso +242 MB de heap em 4 MiB (🟢). Allowlist por `hostname` exato. Três correções: stream que falha no upload virava 500 (agora 400 `UPLOAD_FILE_MISSING`, com teste), exceção do removedor vira 415, e o item 1.1 do `01-security-review.md` dizia que todo pacote com chave importa `server-only`. Gates: `pnpm check` 1120 arquivos sem erro, typecheck 5/5, testes alterados 48/48. Plano de commits combinado da rodada em `../e2e-org-ownership-flake-and-web-api-url/review/review.md`. 8 itens para o `/test` Rodada 2: o `/test` mediu +301 MB de RSS por upload de JPEG hostil; o removedor passou a guardar intervalos e copiar uma vez, saída idêntica em 200 mil entradas, JPEG hostil de 341 ms/+315 MB para 24 ms/+5 MB, 3 testes de contagem de alocação; check e typecheck da api verdes |
| test    | done    | 2026-11-24 01:40 | test/report.md  | 10 ✅, 0 ❌, 2 com parte 🔒 (envio real pelo Resend; toast da caixa de URL sem Storage). Upload real no emulador sem GPS, `APP1` de 36 bytes, foto em retrato no painel, ICC mantido; 413 com `connection: close` em `chunked`; allowlist e avatar antigo por `curl` e navegador; cadastro da landing travado nos 3 idiomas, light/dark, desktop/390 px. E2E 11/11; `api` 1822 (11 testes novos), `web` 313, `email` 209. JPEG hostil de 4 MiB custava +301 MB de RSS por requisição; rodada 2 (2026-11-24 01:50), depois da correção do `/review`: `api` 1825, hostil +11 MB, 4 em paralelo +24 MB, uploads dos três formatos iguais à rodada 1 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- Spec `specs/delivery-security-review.md` (`status: approved`), só a fatia 3 ("arestas"). A fatia 1 saiu na
  PR #64; a fatia 2 está no mesmo working tree, sem commit, em `docs/features/delivery-security-review-slice-2/`.
  Esta fatia fecha a spec. Não editar a spec: arquivá-la é do `/spec --sync`.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md`, "Perguntas
  em aberto (decididas por padrão)".

### Sobreposição com a fatia 2

- Nenhum arquivo de código ou de teste em comum (`plan.md` §B10).
- Três documentos em comum, em trechos distantes: `docs/SECURITY.md`, `docs/delivery/01-security-review.md` e
  `docs/PRE-PRODUCTION.md` (`plan.md` §B9). O `/review` separa por `git add -p`.

### Para o `/develop`

- Os fixtures de `uploadedImageValidation.test.ts` são cabeçalho mais zeros e passam a 415 com o removedor de
  metadados. Montar a estrutura mínima de cada formato, sem afrouxar o removedor (`plan.md` §8, T2).
- Testes que importem `@repo/email` de verdade precisam de `vi.mock("server-only", () => ({}))`.
- Medir as âncoras dos três documentos antes de editar: a fatia 2 deslocou linhas.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Nenhum novo. Sem Storage, o upload segue respondendo 503 `STORAGE_NOT_CONFIGURED` e a caixa de URL aceita só
  objeto do bucket ou foto do Google (`plan.md` §10).

### Branch

- `feat/delivery-security-hardening`, a mesma da fatia 2.
