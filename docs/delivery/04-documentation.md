# Parte 4: documentação

Deixa o repositório pronto para quem chega depois: outra pessoa do time, o cliente, quem vai manter o
produto daqui a seis meses. Também produz o material de apresentação (vídeo e GIF) que o time usa para
mostrar o produto e que o cliente pode publicar.

Visão geral da etapa e regras de status em [`README.md`](README.md).

## 4.1 README no modelo da casa

**Por quê.** Todo produto da casa abre com o mesmo esqueleto de README. Quem já trabalhou num fork acha a
seção de ambientes, os comandos e o relatório de entrega no mesmo lugar em qualquer outro.

**O que fazer.** O README do fork nasce de [`docs/templates/README.template.md`](../templates/README.template.md)
e segue o modelo **sempre**, inclusive depois da entrega. Ao atualizar:

- mantenha a ordem das seções, os títulos e os emojis do modelo;
- descreva o que o **produto** faz em "✨ Funcionalidades" e resuma o que veio do core em "🧱 Herdado do
  next-boilerplate", sem repetir a lista inteira;
- preencha "🌍 Ambientes" com as URLs e o id do projeto Firebase de produção;
- aponte "✅ Entrega" para o relatório desta rodada.

**Como medir.**

```bash
grep -n "{{" README.md                                          # esperado: vazio
grep -nE "^## " README.md                                       # mesma sequência do modelo
grep -niE "next-boilerplate|next-forge|lorem" README.md         # só na seção "Herdado do next-boilerplate"
```

Confira à mão que cada link do README abre (documentos, URLs de produção, relatório) e que nenhuma
credencial de produção, URL interna ou e-mail de pessoa real aparece.

**Aprovado quando** os três comandos saem como esperado e os links abrem. Gravidade: 🟡.

## 4.2 Vídeo e GIF do produto

**Por quê.** O vídeo mostra o produto em uso em uns 20 segundos, o que a lista de funcionalidades não
faz. Ele vai no topo do README como referência para o time e fica publicado para uso em divulgação.

**Ferramenta.** A skill [`brag-slim`](../../.claude/skills/brag-slim/SKILL.md), baixada de
[latent-spaces/brag](https://github.com/latent-spaces/brag) (licença MIT). Ela lê o código, escreve um
roteiro, monta as cenas com as telas reais do produto, compõe a trilha e renderiza o vídeo com o `ffmpeg`.
No Claude Code, peça "let's /brag about this" ou rode `/brag-slim`.

**Passo a passo.**

1. **Capture as telas contra os emuladores.** O vídeo é público, então nenhuma tela pode vir de um banco
   real. O roteiro de captura reaproveita o ambiente da suíte E2E, que ignora o `.env` local e só aceita
   projeto `demo-*`:

   ```bash
   pnpm --filter e2e showcase      # exige JDK 21 no PATH, como o pnpm e2e
   ```

   As telas, em 1440 × 900 e 390 × 844 com densidade 2x, vão para `apps/e2e/showcase-results/` (fora do
   Git). A lista fica em [`apps/e2e/showcase/shots.ts`](../../apps/e2e/showcase/shots.ts): o fork troca as
   rotas do exemplo `entity` pelas telas do próprio produto.
2. **Rode a skill** na raiz do repositório, apontando as telas capturadas e a direção do vídeo
   (público, tom, idioma). O resultado sai em `brag-output/`, que o `.gitignore` descarta.
3. **Copie os entregáveis** para a pasta pública da landing:

   ```bash
   mkdir -p apps/web/public/showcase
   cp brag-output/brag.mp4 apps/web/public/showcase/showcase.mp4
   cp brag-output/brag.jpg apps/web/public/showcase/showcase.jpg
   ffmpeg -y -i apps/web/public/showcase/showcase.mp4 \
     -vf "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=5" \
     -loop 0 apps/web/public/showcase/showcase.gif
   ```

4. **Atualize a seção "🎬 Demonstração"** do README, que já aponta para esses três arquivos.

**Regras do conteúdo.**

- Só dados do seed (`@example.com`) ou registros obviamente fictícios. Nunca nome, e-mail, documento ou
  foto de pessoa real, nem dado de cliente.
- Nenhuma URL interna, chave, token ou nome de projeto de produção na tela.
- Sem afirmação inventada: número, depoimento ou logo de cliente só se forem reais e autorizados.
- Texto do vídeo no idioma principal do produto.

**Como medir.**

```bash
ls -l apps/web/public/showcase/
ffprobe -v error -show_entries format=duration -of csv=p=0 apps/web/public/showcase/showcase.mp4
```

**Aprovado quando** os três arquivos existem, o vídeo tem entre 15 e 25 segundos, o MP4 tem até 15 MB, o
GIF tem até 5 MB e abre no README do GitHub, e alguém do time assistiu ao vídeo inteiro conferindo as
regras de conteúdo. Gravidade: 🔴 se aparecer dado real de pessoa ou segredo; 🟡 nos demais casos.

## 4.3 Documentos do produto em dia

**Por quê.** O fork muda o produto, e os documentos herdados do core descrevem o core. Documento
desatualizado engana mais do que documento nenhum.

**O que conferir.**

- [`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md): toda pendência 🟡 desta entrega está lá, com dono e prazo.
- `.env.example` de cada app: toda variável nova do produto está listada, com valor vazio ou de emulador e
  um comentário dizendo para que serve.
- [`FORKING.md`](../FORKING.md), seção 12: arquivo que o produto passou a alterar e que um próximo fork
  também precisaria alterar está no mapa.
- Funcionalidade do produto com regra de negócio própria (cobrança, permissão, integração) tem um
  documento em `docs/` ou uma seção no README.

**Aprovado quando** os quatro itens conferem. Gravidade: 🟡.

## 4.4 Relatório de entrega publicado

O relatório desta rodada está em `docs/delivery/reports/<AAAA-MM-DD>/report.md`, assinado, e a seção
"✅ Entrega" do README aponta para ele. Gravidade: 🔴 (sem relatório, a entrega não aconteceu).

## Registro no relatório

Na seção 4 do [`report-template.md`](report-template.md): status de cada item, o tamanho e a duração dos
arquivos do vídeo, e quem assistiu ao vídeo antes da publicação.
