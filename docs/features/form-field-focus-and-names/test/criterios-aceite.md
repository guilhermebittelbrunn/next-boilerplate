# Critérios de Aceite (Checklist)

Feature: campos de formulário mantêm o foco, têm nome e travam no carregamento. Os critérios partem da §10 do
`analyze/plan.md`, com os casos-limite que o `/test` acrescentou. O status medido de cada um, e por qual meio,
está em `test/report.md`.

- [x] **Enter no campo de senha não perde o foco**
  No login da app e da web, com senha errada, enviar com Enter no campo de senha deixa o foco no campo depois da
  recusa ("Senha incorreta."), com o valor digitado preservado e nenhum `focusout` do campo entre o Enter e a
  mensagem. Nos diálogos de exclusão de conta (senha errada, `POST /account/deletion` 400) e de troca de e-mail
  (`POST /account/email` 503, `EMAIL_NOT_CONFIGURED`, porque o ambiente não tem Resend) vale o mesmo, e o texto do
  campo volta selecionado. A recusa por senha errada no diálogo de e-mail exige Resend e não foi exercitada; o
  caminho do foco é o mesmo.

- [x] **Enter num campo de texto comum não perde o foco**
  Enviar com Enter no campo de e-mail do login da app ou da web deixa o foco no e-mail durante e depois do pedido.
  Um `disabled` passado pelo chamador continua deixando o campo desabilitado. Sob personificação, os campos de
  `/entities/edit/<id>` ficam editáveis e o bloqueio está no botão de salvar; Enter num deles não envia nada.

- [x] **O campo não aceita digitação durante o envio**
  Enquanto o `handleSubmit` está em andamento, os campos de texto e de senha recebem `readonly` e não `disabled`.
  Terminado o resolver, o atributo sai e o campo volta a aceitar digitação, tanto depois de recusa quanto de
  sucesso.

- [x] **Enter repetido não duplica o pedido**
  Dois ou mais Enter seguidos no campo de senha do login com senha errada geram um único pedido
  `accounts:signInWithPassword`, mesmo quando os Enter seguintes chegam antes de o botão de enviar ficar
  desabilitado. Enquanto o envio está em andamento, e por mais uma volta de timer depois dele, o campo ignora o
  Enter; daí em diante quem bloqueia é o botão desabilitado. Terminada a resposta, Enter volta a enviar: corrigir a
  senha e apertar Enter faz o login, e nos diálogos de conta um segundo Enter depois da recusa manda um segundo
  pedido. A primeira medição reprovou este critério (dois pedidos com 1,9 a 5,9 ms de intervalo); a remedição, com
  o `useSubmitEnterGuard`, aprovou.

- [x] **Placeholder do chamador vence**
  Um `HookFormInputPassword` com `placeholder` mostra o texto do chamador. Sem a prop, mostra `••••••••`. No login
  da app e da web o campo de senha mostra `••••••••`, como antes.

- [x] **Grupo de rádio com nome**
  O grupo de gênero do formulário de `entity` se chama "Gênero", "Gender" ou "Género" conforme o idioma da URL, e o
  de tema das preferências se chama "Tema", "Theme" ou "Tema". Escolher uma opção com as setas e salvar continua
  gravando (gênero `other` no `GET /entities/<id>`; tema escuro aplicado e mantido depois do reload). Um grupo sem
  `label` não ganha `aria-labelledby`, um `aria-labelledby` passado pelo chamador vence, e dois grupos na mesma
  página apontam cada um para o próprio rótulo.

- [x] **Botão mantém a largura em carregamento**
  Um `Button` tem a mesma largura parado e carregando (diferença abaixo de 1 px), com o spinner centralizado e o
  texto transparente, em claro, escuro e 390 px. O nome acessível continua sendo o texto do botão, e o padding não
  muda. Botões que ocupam a largura toda (o "Atualizar" da tabela em 390 px) continuam com a mesma largura.

- [x] **`loading` sempre trava o botão**
  `<Button loading disabled={false}>` fica desabilitado. Sem `loading`, um `disabled` explícito continua valendo.
  O `Footer` e o `PageFormFooter` travam o envio durante o pedido sem fundir os dois estados no próprio código, e
  todo botão observado em carregamento estava com `disabled`.

- [x] **Personificação continua travando**
  Com o admin personificando o usuário comum, o "Salvar" de `/entities/edit/<id>` fica desabilitado, a tela mostra
  "Modo somente leitura", e Enter no campo de nome não dispara pedido. Em `/account`, "Salvar", "Trocar e-mail",
  "Baixar meus dados" e "Excluir minha conta" ficam desabilitados.

- [x] **Testes e gates**
  `pnpm check`, os `typecheck` do design system, da app e da web, as suítes desses workspaces e o `pnpm test` da
  raiz passam. A suíte E2E (`pnpm e2e`) passa com a `A11Y_ALLOWLIST` vazia, sem violação séria ou crítica do axe, e
  o axe rodado à mão nas telas de conta e de edição de `entity` não aponta nada sério ou crítico.
