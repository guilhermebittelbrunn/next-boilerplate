---
description: Leva um fork da ideia ao backlog. Lê o que o formulário visual do `pnpm kickoff` salvou em docs/product/ (produto, domínio, telas, marca e prompt de design), pergunta o que faltar, ajuda a levar o design ao Claude Design e gera as specs do MVP em specs/features/, em ordem de dependência. Não escreve código nem commita.
argument-hint: "[vazio | --refine produto|dominio|telas|marca | --specs]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /kickoff

Entrada: **$ARGUMENTS**

Você é o orquestrador do **kickoff de um fork**: a pessoa acabou de criar o repositório do produto e tem uma
ideia. O kickoff tem duas metades:

1. **Visual, no navegador.** `pnpm kickoff` abre um formulário em `http://localhost:3010` com seis etapas
   (Produto, Recursos e regras, Domínio, Telas, Marca, Revisar) e uma pré-visualização ao vivo: o
   diagrama das entidades, a galeria de telas e a paleta aplicada nos temas claro e escuro. O botão Salvar
   grava `docs/product/kickoff.json` e quatro documentos gerados a partir dele: `PRODUCT.md`, `DOMAIN.md`,
   `SCREENS.md` e `DESIGN-PROMPT.md`. O design de cada tela (PNG, JPG, WebP ou HTML exportado) é arrastado
   para o quadro da tela e vai para `docs/product/screens/`.
2. **Este comando, no Claude Code.** Lê o que foi salvo, completa as lacunas com perguntas e gera o backlog
   do produto.

Código do formulário: [`scripts/kickoff/`](../../scripts/kickoff/). O `kickoff.json` é a fonte; os `.md` são
regenerados a cada salvamento (`pnpm kickoff:render` regenera sem abrir o navegador).

## Regras de escrita

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md): estilo `caveman` nas mensagens deste
comando (sem fixar o modo na sessão) e `humanizer` antes de gravar specs. Repita a regra no prompt de todo
subagent.

## Passo 0 — Onde estamos

1. Se o repositório é o próprio core (o `README.md` é o do `next-boilerplate` e não há `docs/product/`),
   avise que o kickoff é para forks e pergunte se é só um teste. Num teste, use
   `KICKOFF_PRODUCT_DIR=.context/kickoff` para não gravar em `docs/product/` do core.
2. Sem `docs/product/kickoff.json`: pergunte (`AskUserQuestion`) se deve subir o formulário agora. Com o
   "sim", rode `pnpm kickoff` em segundo plano, diga a URL e **pare**: o próximo passo é a pessoa preencher e
   salvar. Ela volta rodando `/kickoff` de novo.
3. Com o arquivo: leia o `kickoff.json` e os quatro `.md`. Se `$ARGUMENTS` traz `--refine <etapa>`, vá direto
   ao Passo 1 só daquela etapa. Com `--specs`, pule para o Passo 4.

## Passo 1 — Lacunas

Confira, e transforme o que faltar em perguntas (no máximo quatro por rodada, cada uma com a sua
recomendação como primeira opção):

- produto: nome, frase, problema, público, como cobra e o que fica fora do MVP;
- domínio: entidade sem papel, relação apontando para entidade que não existe, regra de negócio que cita algo
  que não é entidade;
- telas: entidade sem tela de lista ou formulário, tela sem rota, tela sem estado de erro;
- recursos: modo `simple` com tela no painel do usuário, cobrança descrita sem o recurso de assinaturas ligado,
  organizações citadas nas regras sem o recurso ligado.

### Completar o domínio

No formulário, a pessoa descreve cada entidade só pelo **nome** (em português) e pelo **papel no sistema**.
Campos, tipos e relações são opcionais lá, e o diagrama já liga com linha tracejada as entidades que um papel
menciona (`inferMentions` em `scripts/kickoff/documents.mjs`). Para cada entidade sem campos, proponha a
partir do nome, do papel, das regras de negócio e das telas:

- `codeName`: o nome de código em inglês, no singular (`Agendamento` → `booking`), que vira coleção, rota e
  tipo no slice `entity`;
- `fields`: nome, tipo (um dos `FIELD_TYPES`), obrigatoriedade e observação. Sem `id`, `createdAt`,
  `updatedAt` nem dono: o padrão `entity` do repo já os traz;
- `relations`: confirme cada menção tracejada e escolha a cardinalidade (`1-n`, `n-1`, `n-n`, `1-1`); acrescente
  as que o papel implica sem citar;
- `access`: quem lê e escreve (`owner`, `organization`, `admin`, `public`).

Mostre a proposta numa tabela por entidade e peça confirmação **numa pergunta só** (aceitar tudo, que é a
recomendação; ajustar uma entidade; ou abrir a etapa Domínio no formulário e editar lá). Com o "sim", grave no
`kickoff.json` e marque `"inferred": true` nas entidades que você completou.

### Gravar

Grave as respostas **no `kickoff.json`** (nunca só nos `.md`, que são regenerados) e rode
`pnpm kickoff:render`. Se a pessoa preferir responder no formulário, diga em qual etapa e espere.

## Passo 2 — Design

1. Se alguma tela não tem design anexado, mostre o caminho do `docs/product/DESIGN-PROMPT.md` e explique o
   ciclo: copiar o prompt (botão "Copiar prompt de design" na etapa Revisar), colar no Claude Design,
   exportar cada tela e arrastar para o quadro dela na etapa Telas. O formulário salva o arquivo e atualiza
   o `SCREENS.md` sozinho.
2. Para o Claude Design desenhar com os componentes do próprio repo, a pessoa pode sincronizar o
   `@repo/design-system` com um projeto de design system de lá pela skill `/design-sync`, quando ela
   estiver disponível na conta. Quem inicia é a pessoa; este comando só sugere. O Claude Design avulso
   (`claude.ai/design`) fecha em 14/12/2026 e passa a viver dentro do Claude; se o link do formulário parar de
   abrir, use o Claude direto.
3. Design pendente não bloqueia: as specs saem com "Design: pendente" e a tela entra quando chegar.
4. Com design anexado, abra cada imagem (o `Read` mostra a imagem) e anote, por tela, os componentes e os
   estados que aparecem. Isso vai para a spec correspondente no Passo 4.
5. Se o Claude Design devolveu tokens de cor, ofereça aplicá-los em
   `packages/design-system/styles/globals.css` (claro e escuro) e a paleta dos e-mails em
   `packages/email/brand.ts`. É mudança de código do fork: aplique só com o "sim" e rode `pnpm check`.

## Passo 3 — Identidade e configuração

Monte, a partir do `PRODUCT.md`, a lista do que configurar seguindo o
[`FORKING.md`](../../docs/FORKING.md) §3 e §8: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL`,
`NEXT_PUBLIC_PRODUCT_MODE`, `NEXT_PUBLIC_DEFAULT_LOCALE` e as variáveis de cada recurso ligado. Mostre como
lista; **não grave `.env`** (pode conter segredo e é por ambiente).

## Passo 4 — Specs do MVP

Acione o subagent **`estrategista-produto`** no modo **spec dirigida**, com:

- os quatro documentos de `docs/product/` e as anotações de design do Passo 2;
- a instrução explícita de que **isto é um fork**: specs do domínio do produto são esperadas aqui (a regra
  "genérico no core" vale só para o repositório do boilerplate);
- o corte: **uma spec por módulo** (uma entidade com as telas dela, ou um fluxo que atravessa entidades), mais
  as specs transversais que o produto pedir (marca aplicada, cópia da landing, páginas legais com os dados da
  empresa);
- a ordem: identidade primeiro; entidades na ordem das relações (quem é referenciado vem antes); fluxos
  depois das entidades que usam. Isso vira o `depends_on`;
- o padrão do repo: entidade que é CRUD simples cita o `/new-crud` (slice `entity`) no impacto por camada;
  cada spec cita a seção dela em `docs/product/SCREENS.md` e o arquivo de design em `docs/product/screens/`;
- status `proposed`, bloco Resumo no topo ([`specs/reference/TEMPLATE.md`](../../specs/reference/TEMPLATE.md)) e
  `specs/BACKLOG.md` regravado com a ordem.

Depois, triagem com `AskUserQuestion`: aprovar o lote inteiro (recomendado), aprovar só as primeiras N, ou
revisar uma a uma.

## Passo 5 — Fechar

Mostre: specs criadas e a ordem, o que segue pendente de design, a lista de configuração do Passo 3 e o
próximo comando:

```
/analyze <primeira-spec>     # ou /cycle para rodar a fila sem acompanhar
```

## Regras

- **Não escreva código** fora do Passo 2.5 (tokens, com o "sim"). Não crie branch, não commite, não pushe
  ([`.claude/rules/git-commits.md`](../rules/git-commits.md)).
- `docs/product/` é versionado no fork: é a definição do produto. Imagem pesada de design (acima de alguns MB)
  vale comprimir antes de anexar.
- O formulário escuta só em `127.0.0.1` e recusa escrita vinda de outra origem. Não o exponha na rede.
