# Critérios de Aceite (Checklist)

Status: ✅ verificado nesta etapa, ❌ falhou, 🔒 não verificável sem infra externa. O meio de cada verificação está entre colchetes no fim do parágrafo. Contas usadas: usuário comum, segundo usuário comum e admin do seed do emulador (`docs/SETUP.md`).

- [x] ✅ **A seção da conta acompanha a URL em toda navegação**
  A seção ativa vem do `?tab=` a cada render, e não só na primeira carga (o defeito antigo era a aba não trocar quando a URL mudava com a página já montada). Clicar num item de Configurações do menu lateral com a conta aberta troca a seção sem recarregar a página e sem remontar o cabeçalho; clicar numa aba da lista vertical também. O `h2` da seção, a aba selecionada e o `aria-current="page"` do menu mostram a mesma seção. [E2E `accountSettings.spec.ts` + agent-browser: mesmo nó de `h1` antes e depois, uma única entrada de navegação no `performance`]

- [x] ✅ **URL sem seção ou com seção inválida cai no perfil**
  `/account` e `/account?tab=xyz` são regravados para `?tab=profile`, e os outros parâmetros da query ficam intactos (`?tab=xyz&plan=price_qa` virou `?tab=profile&plan=price_qa`). Um `tab` válido não é regravado. [E2E + agent-browser + Vitest `accountTabs.test.tsx`]

- [x] ✅ **Modo `simple` não oferece cobrança**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple`, a lista vertical, o select e o menu lateral mostram só Perfil, Segurança, Preferências e Privacidade. Abrir `?tab=billing&checkout=success` leva a `?tab=profile&checkout=success`, com "Perfil" ativo no menu. [agent-browser com o app reiniciado em modo `simple` + Vitest `accountTabs.test.tsx`]

- [x] ✅ **Deep link de cobrança mantém os parâmetros de retorno**
  `/<locale>/account?tab=billing&checkout=success&plan=<priceId>` abre a cobrança com a URL intacta. Trocar para Perfil e voltar para Cobrança preserva `checkout` e `plan`, porque a troca de seção altera só o `tab`. [E2E com `checkout=canceled` + agent-browser com `checkout=success&plan=price_qa`]

- [ ] 🔒 **Aviso de checkout ao voltar da Stripe**
  Com a Stripe configurada, a cobrança mostra o aviso do checkout e a espera pela confirmação, e voltar para a seção depois de visitar outra mostra o aviso de novo. Sem Stripe no ambiente, o painel mostra "Cobrança em breve" e o aviso não aparece. [não verificável sem Stripe]

- [x] ✅ **Trocar de aba não enche o histórico**
  O clique na aba e a troca pelo select usam `replaceState`, então o botão voltar do navegador sai da conta em vez de percorrer as abas uma a uma. Já o link do menu lateral é navegação do router e cria uma entrada, como qualquer link. [agent-browser: `history.length` igual a 6 antes e depois de três abas; voltar levou a `/pt-br/entities`]

- [x] ✅ **Menu lateral marca o item ativo pela rota e pela query**
  O sub-item de Configurações correspondente ao `tab` recebe `aria-current="page"` e o mesmo destaque dos itens de primeiro nível (negrito e barra à esquerda), inclusive com parâmetros extras na URL. O grupo Configurações abre sozinho ao chegar na conta. O destaque visual do sub-item faltava e foi corrigido nesta etapa (ver `report.md`). [agent-browser + Vitest `sidebarActiveQuery.test.tsx`, `navActive.test.ts`]

- [x] ✅ **Navegação da conta cabe na tela nos três idiomas**
  Abaixo de `lg`, a lista vertical some e aparece um select com as seções; a partir de `lg`, a lista vertical tem 192 px e os rótulos ficam numa linha só, sem sobreposição. Em 375 px e 1280 px, em pt-br, en e es, `scrollWidth` nunca passou de `innerWidth`. [agent-browser]

- [x] ✅ **Cada bloco da conta é uma região com título, descrição e ação própria**
  Os blocos (Dados pessoais, E-mail, Métodos de login, Senha, Sessões ativas, Sair de todos os dispositivos, Tema e idioma, Baixar meus dados, Excluir minha conta) são `section` nomeadas pelo `h3` do título, com descrição. Os que editam algo têm o próprio botão de salvar dentro do bloco. [agent-browser na árvore de acessibilidade + Vitest `settingsSection.test.tsx`]

- [x] ✅ **Duplo clique em salvar envia uma vez só**
  Duplo clique em "Salvar" do perfil e de "Salvar preferências" gerou um único `PUT /account` cada. O botão do bloco entra em carga e bloqueia novo envio. O bloco de senha não foi medido no navegador (exigiria trocar a senha da conta do seed); o bloqueio do `Footer` com `isLoading` está coberto em teste. [agent-browser na aba de rede + Vitest `sharedFooterPendingState.test.tsx`]

- [x] ✅ **Excluir conta fica isolado no fim da privacidade**
  "Excluir minha conta" é a última região da seção, depois da exportação e do aviso do canal de privacidade, com `data-tone="destructive"`, borda e título em vermelho e gatilho `destructive`. [agent-browser + Vitest `accountPrivacyPanel.test.tsx`]

- [ ] 🔒 **Conta sem senha mostra o canal de privacidade sem tom destrutivo**
  Para conta que entra só com Google, o bloco do canal de privacidade é `SettingsSection` com tom padrão. O emulador do seed não tem conta só com Google e o vínculo exige credenciais OAuth. [não verificável no navegador; Vitest `accountPrivacyPanel.test.tsx` cobre `data-tone="default"`]

- [x] ✅ **Ações que encerram acesso pedem confirmação destrutiva**
  "Sair de todos os dispositivos" e "Encerrar as outras sessões" abrem `AlertDialog` com confirmar `destructive` e foco inicial em Cancelar. Cancelar ou Esc fecha sem requisição e devolve o foco ao gatilho. Encerrar uma sessão específica não pede confirmação e dispara `DELETE /account/sessions/<id>` direto. "Desvincular" ficou desabilitado porque a conta do seed tem um método só; a variante do diálogo dele está coberta em teste. [agent-browser com duas sessões do mesmo usuário + Vitest `accountSessionsPanel`, `accountSecurityForm`, `accountSignInMethodsPanel`]

- [x] ✅ **Diálogos com formulário funcionam no celular**
  A 375 px, os diálogos de trocar e-mail e de excluir conta empilham o rodapé (`column-reverse`, botões com 293 px), abrem com foco no primeiro campo (`newEmail`, `currentPassword`), e o cancelar é `type="button"`: com campo preenchido, Cancelar fecha sem requisição à API e devolve o foco ao gatilho. O confirmar de exclusão é `destructive`. [agent-browser]

- [x] ✅ **Personificação deixa a conta em somente leitura**
  Admin personificando o usuário comum vê o aviso "Modo somente leitura" como primeiro elemento da coluna de conteúdo, acima do `h2`, em todas as cinco seções. Salvar, trocar e-mail, alterar senha, exportar e excluir ficam desabilitados; os campos continuam editáveis, como já eram antes desta mudança. O menu marca a seção ativa. [agent-browser]

- [x] ✅ **Padrão de página nas 11 telas**
  Conta, home comum, entidades (lista, criar, editar), equipe, home do admin, usuários (lista, criar, editar) e auditoria têm um único `h1` no mesmo lugar (topo a 128 px), alinhado à esquerda com o breadcrumb (273 px a 1280 px, 16 px a 375 px). Formulários e conta limitam a largura a 896 px (`max-w-4xl`) a 1280 px; listas e dashboards usam a largura cheia. No `playground`, o breadcrumb continua alinhado ao conteúdo. [agent-browser + Vitest `pageShell.test.tsx`]

- [x] ✅ **Ação primária com destaque e fora da barra do breadcrumb**
  O "Novo" das listas de entidades e de usuários é `variant="default"`, fica ao lado do título, fora do `header`, com contraste de 17,18:1 em light e em dark. [agent-browser + Vitest `entitiesListReadOnly.test.tsx`, `usersListLastAccess.test.tsx`]

- [x] ✅ **Título e breadcrumb não pulam quando a carga termina**
  Nas oito rotas com `loading.tsx` (home comum, entidades, editar entidade, equipe, conta, home do admin, usuários, auditoria), o placeholder do título do `PageSkeleton` e o `h1` real ficaram na mesma posição (deslocamento de 0 px em x e y), e o placeholder do breadcrumb fica na mesma faixa de 64 px. [agent-browser com `MutationObserver` durante a navegação + Vitest `pageShell.test.tsx`]

- [ ] ❌ **Campo focado não fica escondido atrás do rodapé fixo**
  Nos formulários de página inteira, a barra fixa de ações não pode cobrir o campo com foco (WCAG 2.2 SC 2.4.11). A 375 px, em editar entidade, navegar com as setas no grupo "Gênero" põe o foco no rádio "Outro" inteiramente atrás da barra (rádio de 764 a 780 px, barra de 743 a 812 px), sem rolagem. Os campos alcançados com Tab ficaram visíveis, e editar usuário não teve campo coberto. O rodapé fixo já existia antes desta mudança e foi mantido por decisão do plano. [agent-browser]

- [x] ✅ **Contraste e axe das seções da conta**
  O gatilho inativo da lista vertical (`text-foreground/60`) tem 5,25:1 em light e 7,66:1 em dark. O axe do `a11yDark.spec.ts` passou sem violação `serious` ou `critical` em `?tab=profile`, `?tab=security` e `?tab=privacy`. [agent-browser + E2E]

- [x] ✅ **Textos vêm do dicionário e o menu usa os mesmos rótulos da seção**
  Nenhum texto novo fora de `@repo/internationalization`; a paridade pt-br, en e es está verde. Os sub-itens do menu usam `account.tabs`, com "Perfil" no primeiro, e batem com a lista vertical e o select nos três idiomas. [Vitest de paridade + `commonNavRoutes.test.tsx` + agent-browser]

- [x] ✅ **Autorização das rotas tocadas não mudou**
  Sem sessão, um deep link volta ao destino depois do login; o usuário comum que abre `/admin` volta para o painel comum; o admin troca de painel e volta. Nada de API nem guard mudou nesta entrega. [E2E `signIn.spec.ts`, `panelSwitch.spec.ts`]

- [x] ✅ **Tema e largura em todas as telas do corte**
  As telas foram percorridas em light e dark, a 375 px e a 1280 px, sem rolagem lateral. A tabela antd das listas segue o tema escuro. [agent-browser]
