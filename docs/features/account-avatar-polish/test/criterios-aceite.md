# Critérios de Aceite (Checklist): account-avatar-polish

Status medido no `/test` de 2026-11-26, atualizado na reconferência da correção (01:55). Meio de verificação
entre parênteses. Detalhe e evidência em
[`report.md`](report.md).

- [x] **Upload de avatar desabilitado sob personificação** (e2e + teste de componente)
  Com o admin personificando um usuário comum sem avatar e o storage no emulador, o botão "Escolher imagem" da
  aba Perfil em `/account` fica `disabled`, e o `<input type="file" id="avatar">` também. Clicar no botão e no
  rótulo "Foto de perfil" não entrega nenhum clique ao input, então o seletor de arquivos não abre, e nenhuma
  requisição `POST /files` sai do navegador. O Salvar segue desabilitado.

- [x] **Substituir e remover desabilitados sob personificação** (e2e + teste de componente)
  Quando o usuário personificado já tem avatar, "Trocar imagem" e "Remover imagem" ficam `disabled`. Clicar
  em "Remover imagem" não muda o campo: a prévia continua visível.

- [x] **Sem regressão fora da personificação** (e2e)
  O usuário comum em `/account` e o admin em `/admin/account` escolhem, trocam e removem o avatar. Nos dois
  casos o upload real no emulador termina com `POST /files` 201 e `PUT /account` 200, e o toast "Perfil
  atualizado." aparece. Os erros de arquivo grande ou de tipo inválido não foram percorridos nesta passada; o
  caminho não mudou.

- [ ] **Storage desabilitado não muda** (não coberto)
  Sem storage, o campo de avatar é o input de URL e o comportamento é o anterior. Esta passada rodou só com o
  storage no emulador. A mudança fica no ramo do `HookFormImageUpload`, então o ramo do input de URL não foi
  tocado, mas isso é leitura de código, não medição.

- [x] **API continua sendo a barreira** (teste de rota)
  Uma chamada forçada a `POST /files` sob personificação continua recebendo
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Coberto por `apps/api/__tests__/fileUploadRoute.test.ts` e
  `impersonationReadOnly.test.ts`, verdes na última medição da raiz. A mudança é só de UI.

- [x] **Avatar vazio no menu de perfil não gera `src=""`** (e2e no dev e em produção + teste de componente)
  Com conta e usuário Firebase sem foto, o menu de perfil mostra as iniciais e não monta `<img>`. Quando a URL
  do avatar passa de uma imagem já carregada para vazio (remover o próprio avatar, ou o admin com avatar
  personificar um usuário sem avatar), o `<img>` sai do DOM com o `src` intacto e as iniciais entram no lugar.
  O console não registra "An empty string ("") was passed to the src attribute". Na primeira medição este
  critério falhou; a correção em `ProfileDropdown.tsx` passou na reconferência.

- [x] **Origem do aviso de `src=""` registrada** (e2e, dev e produção)
  A origem era código do repo: `ProfileDropdown.tsx` passava `""` ao `AvatarImage`
  (stack `avatar.tsx:32` ← `ProfileDropdown.tsx:53` ← `Navbar.tsx:33`). Corrigido: o `AvatarImage` só monta
  com URL. O teste `profileDropdownAvatarEmpty.test.tsx` cobre o caso com uma imagem carregada.

- [x] **Avatar novo aparece no menu sem recarregar** (e2e no dev e em produção)
  Depois de remover, enviar uma imagem e salvar troca as iniciais pela imagem no menu de perfil, na mesma
  página, sem navegação.

- [x] **Tema e responsivo** (e2e)
  Os botões desabilitados ficam com `opacity: 0.5` e `cursor: default`, legíveis e visivelmente inativos em
  light e dark, a 1440 px e a 390 px, em pt-br, en e es. Contraste medido do texto desabilitado: 4,93 a 5,15
  no dark e 3,34 a 3,71 no light. A WCAG não exige contraste mínimo de controle desabilitado.
