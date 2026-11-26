# Relatório de QA: account-avatar-polish

Rodada autônoma do `/cycle`, 2026-11-26. Branch `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida). Nada commitado, nenhuma branch criada.

**Veredito final: `done`.** O upload travado sob personificação funciona como o plano pede. A primeira medição
achou a origem do aviso de `src=""` em `apps/app/shared/components/ui/ProfileDropdown.tsx` e devolveu o defeito.
O `/review` corrigiu, e a reconferência (seção no fim) mediu a correção no `dev` e em produção.

## Defeito (corrigido, ver reconferência): `ProfileDropdown` renderiza `<img src="">` quando o avatar deixa de existir

**Onde.** `ProfileDropdown.tsx:44` calcula `avatarSrc = account?.avatarUrl ?? user?.photoURL ?? ""`, e a
linha 53 passa esse valor ao `AvatarImage`. O mesmo código existe em `HEAD` (linhas 38 e 47).

**Mecanismo.** O `AvatarImage` do Radix (`@radix-ui/react-avatar` 1.3.1) guarda o status de carregamento no
contexto do `Avatar` e só o atualiza num `useLayoutEffect`. Quando o `src` passa de uma URL já carregada
(status `loaded`) para `""`, a primeira renderização ainda vê `loaded` e monta `<img src="">`. Só depois o
efeito põe o status em `error` e o `<img>` sai. O teste em jsdom não pega esse caso porque nenhuma imagem
carrega no jsdom: o status nunca chega a `loaded`.

**Component stack** (overlay do Next, `next dev`, as duas reproduções):

```
Console Error
An empty string ("") was passed to the src attribute. This may cause the browser to download the whole
page again over the network. To fix this, either do not render the element at all or pass null to src
instead of an empty string.
../../packages/design-system/components/ui/avatar.tsx (32:5) @ AvatarImage
Call Stack 57 (52 ignore-listed)
  img
  AvatarImage   ../../packages/design-system/components/ui/avatar.tsx (32:5)
  ProfileDropdown   shared/components/ui/ProfileDropdown.tsx (53:25)
  Navbar   shared/components/ui/Navbar.tsx (33:17)
  AppLayout   app/[locale]/(authenticated)/(admin)/admin/layout.tsx (52:17)
```

**Repro (emulador + seed).**

1. Admin com avatar salvo, em `/pt-br/admin/account`.
2. Seletor "Ambiente" > "Painel do usuário". O alvo padrão é `user@example.com`, sem avatar. O aviso sai no
   console na troca, com a URL já em `/pt-br`.
3. Sem personificação: admin em `/admin/account`, "Remover imagem" > "Salvar". O aviso sai logo depois do
   `PUT /account` 200.

O segundo caso mostra que o defeito não depende da personificação. Qualquer conta que perca o avatar com a
imagem já carregada no menu dispara o aviso.

**Produção** (`next build && next start`, mesmo repro 3). O console fica limpo, porque o React de produção
não emite avisos de desenvolvimento. O commit intermediário continua lá: um `MutationObserver` no `<img>` do
menu registrou a remoção do atributo `src` (`now: null`) com o elemento já fora do DOM na hora do callback.
Não houve requisição extra. Em produção o efeito é um commit a mais, sem sintoma visível.

**Correção sugerida (não aplicada).** Não passar string vazia ao `AvatarImage`: `?? undefined` no lugar de
`?? ""`, ou renderizar o `AvatarImage` só quando houver URL. Para cobrir em jsdom, o teste precisa simular o
status `loaded` (por exemplo, mockando `window.Image` para disparar `load`) e depois trocar a conta para uma
sem avatar. Assim o `profileDropdownAvatarEmpty.test.tsx` deixa de guardar só a primeira renderização.

## Verificar no `/test`

| Item do `review.md` | Veredito |
|---------------------|----------|
| 1. Upload travado sob personificação, sem avatar | **Confirmado.** `/pt-br/account` personificando `user@example.com`: `input#avatar` com `disabled=true`, botão "Escolher imagem" com `disabled=true`, `opacity 0.5`, `cursor default`. Com um listener de `click` no input, clicar no botão e duas vezes no `label[for=avatar]` deu 0 cliques no input. Nenhum `POST /files` na aba de rede. Salvar e "Trocar e-mail" também desabilitados. |
| 2. Origem do `src=""` | **Derrubado: é defeito do repo.** `ProfileDropdown.tsx:53`, stack e repro acima. Não é overlay nem automação do `agent-browser`. |
| 3. Upload travado sob personificação, com avatar | **Confirmado.** Personificando `user2@example.com` (avatar enviado nesta passada): "Trocar imagem", "Remover imagem" e o input `disabled`. Clicar em "Remover", em "Trocar" e no rótulo deu 0 cliques no input. A prévia continuou no DOM e nenhum `POST /files` saiu. |
| 4. Sem personificação, upload funciona | **Confirmado.** `user2@example.com` em `/account` e `admin@example.com` em `/admin/account`: controles habilitados, `POST /files` 201, `PUT /account` 200, toast "Perfil atualizado.", imagem do emulador no menu e na prévia depois do reload. Controle do instrumento: no admin, clicar no rótulo entregou 1 clique ao input e "Trocar imagem", mais 1. |
| 5. Estado desabilitado legível | **Confirmado.** Medido na tela da personificação. Dark: contraste 5,03 ("Trocar imagem"), 5,15 ("Remover imagem"), 4,93 ("Salvar"). Light: 3,71, 3,71 e 3,34. Desktop 1440 px e mobile 390 px, sem rolagem horizontal. Rótulos nos 3 idiomas, todos `disabled`: pt-br "Trocar imagem"/"Remover imagem"/"Salvar", en "Replace image"/"Remove image"/"Save", es "Cambiar imagen"/"Quitar imagen"/"Guardar". |

O contraste é a razão WCAG calculada no DOM, compondo cor do texto, fundo do botão e `opacity` sobre o fundo
do card. A WCAG isenta controles desabilitados do mínimo de 4,5.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Upload de avatar desabilitado sob personificação | PASS | e2e + `accountProfileFormAvatarReadOnly.test.tsx` |
| Substituir e remover desabilitados sob personificação | PASS | e2e + teste de componente |
| Sem regressão fora da personificação | PASS (erros de arquivo inválido não percorridos) | e2e |
| Storage desabilitado não muda | não coberto | leitura de código apenas |
| API continua sendo a barreira | PASS | teste de rota (`fileUploadRoute.test.ts`, `impersonationReadOnly.test.ts`) |
| Avatar vazio no menu de perfil não gera `src=""` | FALHOU na 1ª medição, PASS na reconferência | e2e (dev e produção) + teste de componente |
| Avatar novo aparece no menu sem recarregar | PASS | e2e (dev e produção) |
| Origem do aviso de `src=""` registrada | PASS | e2e no dev e em produção |
| Tema e responsivo | PASS | e2e |

## Cobertura e gates

| Comando | Resultado |
|---------|-----------|
| `pnpm exec vitest run __tests__/profileDropdownAvatarEmpty.test.tsx __tests__/accountProfileFormAvatarReadOnly.test.tsx` (em `apps/app`) | 2 arquivos, 6 testes, todos passando |
| `pnpm --filter app test` (sem `--force`, sem carga minha) | 151 arquivos, 1366 testes passando, saída 0, 181 s |
| `pnpm --filter app typecheck` | saída 0 |
| `pnpm --filter app exec next build` (para o item 2) | saída 0 |

Não rodei o `pnpm test` da raiz. A última medição é a de `app-test-suite-stability` (15/15, saída 0, relatório
gravado às 01:08). Depois dela só mudaram arquivos de `apps/app` (`AccountProfileForm.tsx` e os dois testes
novos), que a suíte do app acima cobre. Também não remedi `pnpm check` (medido pelo `/develop` e citado pelo
`/review`; não editei código) nem a paridade de i18n (sem chave nova).

Não criei teste. O defeito precisa de correção de produção antes; a sugestão de teste está acima.

## Decisões de custo de teste

- `AccountProfileForm.tsx`: o teste de componente em jsdom prova o `disabled` nos três controles. O clique no
  rótulo, que o jsdom não decide, foi medido no navegador. Nenhum teste da faixa cara se justifica.
- `ProfileDropdown.tsx`: o teste jsdom existente cobre só a primeira renderização. O caso que falha pede um
  mock de `window.Image`, ainda na faixa barata.
- `POST /files`: o guard já tem teste de rota com mock. Nada novo.

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste renderiza `AccountTabs area="admin"` com o formulário de perfil | Continua aberta no Vitest. O caminho real foi medido no e2e (item 4: `/admin/account` habilitado e upload completo). |
| Clique no `<label>` sob personificação não testado em jsdom | Fechada no e2e: 0 cliques no input sob personificação, 1 no controle fora dela. |
| Origem do `src=""` | Fechada: defeito em `ProfileDropdown.tsx`, devolvido ao `/develop`. |

## Achados fora do escopo

- **Prévia do avatar achatada no mobile.** A 390 px, o contêiner da prévia do `ImageUploadInput`
  (`relative overflow-hidden rounded-full`) mede 55,4 x 64 px e a imagem vira uma elipse. Aparece com e sem
  personificação e não vem deste diff. Sugestão para o backlog: `shrink-0` no contêiner da prévia, em
  `packages/design-system/components/ui/image-upload-input.tsx`.
- **Menu de perfil mistura identidades sob personificação.** Personificando `user@example.com`, que não tem
  nome de exibição, o menu mostrou "QA", o nome do admin vindo do `user.displayName` do Firebase como
  fallback. O comportamento já existia e não pertence a esta tarefa.

## Ambiente do e2e

Portas checadas antes: 3000, 3001, 3002, 3003, 9099 e 4001 livres. A 8080 e a 9199 estavam ocupadas por um
`firebase emulators:exec` de outro workspace (suíte de emulador em andamento). Não mexi nele; ele terminou
sozinho e as portas ficaram livres antes de eu subir os meus.

Subi e derrubei por PID:

- `pnpm emulators` (Auth 9099, Firestore 8080, Storage 9199, UI 4001), com o JDK 21 do Homebrew no `PATH`,
  e o seed com o `.env.example` da API;
- `api` em 3002 com `next dev`; `app` em 3000 com `next dev` e depois `next build` + `next start` para o
  item 2. Os dois carregaram o `.env.example` (emulador, projeto `demo-next-boilerplate`).

No fim fechei a sessão do `agent-browser`, matei os PIDs e conferi vazias as portas 3000, 3001, 3002, 3003,
9099, 8080, 9199, 4001, 4400, 4500 e 9150. Apaguei os `AGENTS.md` que o `next dev` gerou em `apps/api` e
`apps/app`. O `.next` de `apps/app` ficou com o build de produção (ignorado pelo git).

Screenshots em `test/e2e/` (descartados pelo `.gitignore`; o texto acima é a evidência): `01-comum-upload-salvo`,
`02-admin-upload-salvo`, `03-personificando-sem-avatar-dark-desktop`, `04-personificando-com-avatar-dark-desktop`,
`05-personificando-com-avatar-light-desktop`, `06-es-light-mobile`, `07-en-dark-mobile`.

## Dados de QA e estado de dev

Tudo no emulador, sem export: o estado sumiu quando ele parou. Nenhum projeto Firebase real foi tocado e
nenhuma conta nova foi criada (`qa-account-avatar@example.com` não foi necessária).

- Contas do seed: `admin@example.com`, `user@example.com`, `user2@example.com`. A senha é a do seed,
  documentada em `docs/SETUP.md`.
- Mudanças só no emulador: `user2` ganhou nome "QA Dois" e avatar; o admin ganhou nome "QA Admin" e teve o
  avatar enviado e removido duas vezes. Os uploads órfãos ficaram no Storage do emulador.

## Cross-check

`/account` comum, `/account` personificando (com e sem avatar) e `/admin/account`; light e dark; 1440 px e
390 px; pt-br, en e es. `apps/web` não é afetado. Modo `subscription`, o padrão do `.env.example`; o modo
`simple` não muda nada neste formulário.

## Roteiro manual (para reconferir a correção)

1. `pnpm emulators`, `pnpm seed`, API e app com o `.env.example`.
2. Entrar como `admin@example.com`, abrir `/pt-br/admin/account`, enviar uma imagem e salvar.
3. Com o console aberto, clicar em "Remover imagem" e depois em "Salvar". Esperado depois da correção:
   nenhum aviso de `src` vazio.
4. Enviar a imagem de novo e trocar "Ambiente" para "Painel do usuário" (alvo `user@example.com`). Esperado:
   nenhum aviso.
5. Em `/pt-br/account` personificando, conferir "Escolher imagem" desabilitado e clicar no rótulo "Foto de
   perfil": o seletor não abre e nenhum `POST /files` sai.

## Reconferência da correção (2026-11-26 01:55)

O `/review` mudou `ProfileDropdown.tsx`: `avatarSrc = account?.avatarUrl || user?.photoURL || null`, e o
`AvatarImage` só monta quando há URL. O `profileDropdownAvatarEmpty.test.tsx` ganhou um terceiro caso, com
`window.Image` mockada como carregada. Medi de novo, do zero: emulador limpo, seed, API e app com o
`.env.example`, sessão nova do `agent-browser`.

| Item | Veredito | O que medi |
|------|----------|------------|
| Repro B no `next dev` (admin remove o próprio avatar e salva) | **Confirmado** | `PUT /account` 200. Console sem nenhum aviso de `src` vazio. O menu passou a mostrar as iniciais "QA", sem `<img>`. |
| Repro A no `next dev` (admin com avatar troca "Ambiente" para "Painel do usuário") | **Confirmado** | URL `/pt-br`, alvo `user2@example.com` (sem avatar no seed novo). Console sem aviso e sem selo de issues do Next. Menu com as iniciais "us", sem `<img>`. |
| Produção (`next build && next start`, repro B) | **Confirmado** | `MutationObserver` no gatilho do menu (subárvore, filhos e atributo `src`): exatamente dois eventos, `<img>` removido com o `src` ainda preenchido e `<span>` "QA" adicionado. Nenhuma mudança de `src` antes da saída. Console limpo. |
| Caminho inverso (enviar de novo e salvar) | **Confirmado** | No `dev` e em produção, o menu trocou as iniciais pela imagem do emulador. Um marcador em `window` sobreviveu à operação, então não houve recarga. Em produção o observer viu o `<img>` entrar, o `<span>` sair e o `src` receber a URL do upload, nunca vazio. |
| Teste novo | **Confirmado** | `pnpm exec vitest run __tests__/profileDropdownAvatarEmpty.test.tsx`: 3/3. |
| Suíte do app | **Confirmado** | `pnpm --filter app test`, sem `--force`: 151 arquivos, 1367/1367, saída 0. Bate com o número do `/review`. |

Não remedi a reprovação do teste novo contra o código antigo; o `/review` mediu isso e o mecanismo do defeito
já estava provado na primeira passada.

Ambiente da reconferência: todas as portas livres antes. Subi `pnpm emulators`, o seed, a API (`next dev`,
3002) e o app (`next dev`, depois `next build` + `next start`, 3000). Fechei a sessão do `agent-browser`,
matei os PIDs e conferi vazias 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500 e 9150. Apaguei os
`AGENTS.md` gerados em `apps/api` e `apps/app`. Nenhuma conta nova; só as do seed, no emulador. O admin ficou
com nome "QA Admin" e avatar, só no emulador, que já parou.
