# Relatório do `/test`: prévia do upload de imagem achatada no mobile

Data: 2026-11-26. Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida). Escopo:
`className="shrink-0"` no `ResponsiveImage` da prévia em
`packages/design-system/components/ui/image-upload-input.tsx` e o caso novo em
`packages/design-system/__tests__/imageUploadInput.test.tsx`.

Resultado: 8 critérios aprovados, 1 não verificado (storage desligado), nenhum reprovado. O controle
reproduziu o defeito antigo, então o 64 x 64 medido vem da correção e não de sobra de largura.

## Gate herdado aberto

O `STATE.md` mostra `review = in-progress`. Esta rodada é do `/cycle`, que não commita, então ainda não há
commits da feature. O gate do `/review` continua aberto e precisa ser fechado quando o `/review` executar o
plano de commits (commits 7 e 50 do plano combinado).

## Cobertura de testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` (1ª execução, load average entre 19 e 32) | 4 de 173 reprovaram, 10 de 14 arquivos passaram |
| `NODE_ENV=test pnpm exec vitest run` em `packages/design-system` (2 execuções seguidas) | 14 arquivos, 173 testes, todos passando, exit 0 |
| `pnpm test` na raiz, 1ª execução (`uptime` antes: load 5,63; depois: 26,67) | exit 1. `api:test` com 131 arquivos e 1880 testes passando, mas 2 erros `[vitest-pool]: Timeout starting forks runner`; o turbo abortou o `app:test` no meio e o `test:emulator` não chegou a rodar |
| `pnpm test` na raiz, 2ª execução (`uptime` antes: load 18,83; depois: 22,90) | exit 0, 15 de 15 tasks, 12 em cache, 2m21s. `api` 1880/1880, `api:test:emulator` 280/280, `app` 1378/1378, `@repo/design-system` 173/173, `web` 315/315 |

O número do design system bate com o handoff (14 arquivos, 173 testes). A falha da primeira execução não
deixou nome de teste no log que guardei, e as duas reexecuções passaram sem mudança de código. O erro da raiz
é de infraestrutura do Vitest (o pool de forks não subiu a tempo) com a máquina carregada por outra sessão.
Registro como instabilidade sob carga, não como defeito da feature. Ninguém usou `--force`.

Não rodei `typecheck` nem `pnpm check`: não criei nem alterei código, e os números do handoff valem
(`@repo/design-system typecheck` e `app typecheck` com exit 0, `pnpm check` em 1156 arquivos sem ajuste).
Paridade de i18n não se aplica, porque nenhuma chave mudou.

### Decisões de custo de teste

- `image-upload-input.tsx`: nenhum teste novo. O caso de classe do `/develop` trava a regressão no nível mais
  barato, e a proporção só se prova com layout real, que veio da passada de browser. Nenhum teste da faixa
  cara se justifica, porque a infra não é o objeto.
- Ausência de prévia sem `value`: fechada pela medição no browser (célula 17). Um caso Vitest também
  resolveria; não acrescentei porque a medição cobre e o comportamento não mudou com este diff.

## Verificar no `/test` (lista do `review.md`)

| Item | Veredito |
|------|----------|
| 1. Pai do `img` mede 64 x 64 a 390 px (perfil e entidade, 3 idiomas, light e dark) | confirmado, 12 de 12 células |
| 2. `scrollWidth <= innerWidth` nas mesmas células | confirmado, 390 = 390 em todas |
| 3. A 1280 px, 64 x 64 ao lado dos botões | confirmado, 4 de 4 células |
| 4. Criação de entidade sem foto não tem `img` no campo | confirmado |
| `/admin/account`, 390, pt-br, light | confirmado, 64 x 64 |

## Medições

Instrumento: `getBoundingClientRect()` do `parentElement` do `img` dentro de
`[data-slot="image-upload-input"]`, mais `document.documentElement.scrollWidth` contra `innerWidth`. "Linha" é
a largura da linha flex da prévia; "coluna" é a da coluna de botões e hint. O tema veio de
`prefers-color-scheme` (o app segue o sistema), e a classe `dark` no `html` confirmou o tema em cada célula.
Altura da janela: 844 px no mobile, 900 px no desktop.

| # | Tela | Largura | Tema | Idioma | Prévia (w x h) | scrollWidth / innerWidth | Linha / coluna |
|---|------|---------|------|--------|----------------|--------------------------|----------------|
| 1 | `/account` perfil | 390 | light | pt-br | 64 x 64 | 390 / 390 | 324 / 244 |
| 2 | `/account` perfil | 390 | dark | pt-br | 64 x 64 | 390 / 390 | 324 / 244 |
| 3 | `/account` perfil | 390 | light | en | 64 x 64 | 390 / 390 | 324 / 244 |
| 4 | `/account` perfil | 390 | dark | en | 64 x 64 | 390 / 390 | 324 / 244 |
| 5 | `/account` perfil | 390 | light | es | 64 x 64 | 390 / 390 | 324 / 244 |
| 6 | `/account` perfil | 390 | dark | es | 64 x 64 | 390 / 390 | 324 / 244 |
| 7 | `/account` perfil | 1280 | light | pt-br | 64 x 64 (x = 593,5) | 1280 / 1280 | 582 / 287,2 |
| 8 | `/account` perfil | 1280 | dark | pt-br | 64 x 64 (x = 593,5) | 1280 / 1280 | 582 / 287,2 |
| 9 | Entidade, editar | 390 | light | pt-br | 64 x 64 | 390 / 390 | 326 / 246 |
| 10 | Entidade, editar | 390 | dark | pt-br | 64 x 64 | 390 / 390 | 326 / 246 |
| 11 | Entidade, editar | 390 | light | en | 64 x 64 | 390 / 390 | 326 / 246 |
| 12 | Entidade, editar | 390 | dark | en | 64 x 64 | 390 / 390 | 326 / 246 |
| 13 | Entidade, editar | 390 | light | es | 64 x 64 | 390 / 390 | 326 / 246 |
| 14 | Entidade, editar | 390 | dark | es | 64 x 64 | 390 / 390 | 326 / 246 |
| 15 | Entidade, editar | 1280 | light | pt-br | 64 x 64 (x = 352,5) | 1280 / 1280 | 832 / 287,2 |
| 16 | Entidade, editar | 1280 | dark | pt-br | 64 x 64 (x = 352,5) | 1280 / 1280 | 832 / 287,2 |
| 17 | Entidade, criar (sem `value`) | 390 | light | pt-br | sem `img` no campo | 390 / 390 | - |
| 24 | `/admin/account` perfil | 390 | light | pt-br | 64 x 64 | 390 / 390 | 324 / 244 |
| 25 | `/account` perfil (extra) | 320 | light | es | 64 x 64 | 320 / 320 | 254 / 174 |

Em todas as células com prévia, o `flex-shrink` computado do contêiner foi `0` e a classe lida foi
`relative overflow-hidden rounded-full shrink-0`. A 390 px a largura da coluna não muda entre idiomas (244 no
perfil, 246 na entidade): o hint quebra linha e os botões cabem.

### Controle: o defeito antigo reaparece sem a classe

Na mesma página carregada, removi `shrink-0` do contêiner com `classList.remove("shrink-0")` e medi de novo,
a 390 px, light:

| Tela | Idioma | Com `shrink-0` | Sem `shrink-0` | Coluna sem a classe |
|------|--------|----------------|----------------|---------------------|
| `/account` perfil | pt-br | 64 x 64 | 56,14 x 64 | 251,9 |
| `/account` perfil | en | 64 x 64 | 59,34 x 64 | 248,7 |
| `/account` perfil | es | 64 x 64 | 58,22 x 64 | 249,8 |
| Entidade, editar | pt-br | 64 x 64 | 56,5 x 64 | 253,5 |
| Entidade, editar | en | 64 x 64 | 59,72 x 64 | 250,3 |
| Entidade, editar | es | 64 x 64 | 58,59 x 64 | 251,4 |

Sem a classe, o `flex-shrink` volta a `1` e a largura cai entre 4,3 e 7,9 px, perto do 55,4 x 64 que o
`/test` de `account-avatar-polish` mediu antes da correção. A diferença para aquele número vem do nome de
exibição e do conteúdo da coluna, que não são os mesmos. Nos screenshots, a prévia aparece como círculo com a
classe e como elipse vertical sem ela.

### Evidência visual

Os prints ficam em `test/e2e/` (`01` a `17`, `24` e `25` para as células; `18` a `23` para o controle), e o
`.gitignore` descarta a pasta. Conferi dois deles. `02-account-390-dark-pt-br.png` mostra a prévia redonda à
esquerda de "Trocar imagem" e "Remover imagem", com o hint "JPG, PNG ou WebP, até 4 MB." em uma linha.
`18-controle-sem-shrink-account-390-light-pt-br.png` mostra a mesma prévia achatada em elipse. A imagem de
teste é um gradiente sintético de 400 x 300 px; nenhum print tem foto ou e-mail de pessoa real.

## Ambiente do e2e

No início, as portas 3000, 3002, 8080, 9099, 9199 e 4001 estavam ocupadas por outro checkout
(`agent-board/pipefish`, rodando a própria suíte e2e). Reutilizar seria medir o código errado, então não
reutilizei nem derrubei nada daquele checkout. As portas se liberaram em seguida, e o outro checkout passou a
usar portas alternativas (9098, 9198, 4401, 4501, 3012).

Subi por conta própria, com os valores de `apps/api/.env.example` e `apps/app/.env.example`, que já apontam
para o emulador com storage ligado:

- `pnpm emulators` (auth, firestore, storage) com JDK 21 via `JAVA_HOME=/opt/homebrew/opt/openjdk@21`;
- o seed do emulador (`node scripts/seed-emulator.mjs` em `apps/api`);
- `pnpm --filter api dev` (3002) e `pnpm --filter app dev` (3000).

No fim, fechei as duas sessões do `agent-browser` e encerrei os processos pelo PID. O `kill` no PID do pnpm
deixou os `next-server` filhos e o emulador vivos; conferi pelo `cwd` que eram deste checkout e matei esses
PIDs também. O `lsof` confirmou 3000, 3002, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 livres. Só depois rodei
o `pnpm test` da raiz, cujo `test:emulator` sobe e derruba o próprio emulador. Apaguei os
`firestore-debug.log` que as execuções deixaram na raiz e em `apps/api` (os dois são ignorados pelo git).

## Dados e contas

Nenhuma conta nova. Usei as contas do seed do emulador (`user@example.com` e `admin@example.com`); a senha é a
do seed, documentada em `docs/SETUP.md`. Tudo vive só no emulador, que já foi derrubado:

- `user@example.com`: nome de exibição "QA Avatar" e avatar enviado;
- entidade "Retired Unit" desse usuário: foto enviada;
- `admin@example.com`: nome de exibição "QA Admin" e avatar enviado.

Nada foi criado no projeto Firebase de dev, e o `docs/PRE-PRODUCTION.md` não muda.

## Arquivos gerados no working tree

A lista de `AGENTS.md` fora de `node_modules` é a mesma antes e depois da passada: `./AGENTS.md` (já
modificado no working tree por outra tarefa) e `.claude/skills/vercel-react-best-practices/AGENTS.md`.
Nenhum foi gerado. O `git status --porcelain --untracked-files=all` também ficou igual; os únicos arquivos
novos desta etapa são `test/criterios-aceite.md` e este relatório, mais os prints ignorados.

## Lacunas

| Lacuna herdada | Veredito |
|----------------|----------|
| Proporção 64 x 64 só se prova no browser (handoff e review) | fechada aqui, com controle |
| Ausência de prévia sem `value` sem teste (handoff e review) | fechada aqui pela medição no browser; continua sem caso Vitest |
| Sem rolagem horizontal a 390 px era estimativa (review) | fechada aqui, medida também a 320 px |
| `/admin/account` sem medição (plano) | fechada aqui |
| Storage desligado mostra o campo de URL (critério do plano) | continua aberta, 🔒: não percorrida no browser; o diff não toca nesse ramo |
| Teste de classe depende de o `img` ser filho direto do contêiner (nit do review) | fora de escopo, aceito pelo review |

Para fechar o 🔒 manualmente: subir o app com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` e
`NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` vazios, abrir a edição de entidade a 390 px e conferir que aparece
o campo de URL da foto, sem prévia e sem rolagem horizontal.

## Cross-check

`apps/web` não usa o componente. Comum e admin foram medidos (`/account` e `/admin/account`). Impersonação e
modo `simple` não mudam este layout e não foram percorridos. Light e dark, 390, 320 e 1280 px e pt-br, en e es
estão na tabela de medições.
