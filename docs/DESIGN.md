# Design: o contrato de interface do boilerplate

Este documento diz como uma tela deste repositório deve parecer, se mover e ser conferida antes de
ser dada como pronta. Vale para o `apps/app` (painel), para o `apps/web` (landing) e para o
`@repo/design-system`. Todo fork herda o contrato; o que muda de um produto para outro é a marca
(seção 6), não as regras.

As regras saíram de seis skills versionadas em `.claude/skills/`. A seção 1 diz qual skill usar em
cada etapa. As seções 2 a 5 são o que já foi decidido a partir delas, para ninguém precisar reabrir
a decisão a cada tela.

## 1. As skills e quando usar cada uma

| Etapa | Skill | O que ela decide |
|-------|-------|------------------|
| Antes de desenhar: posicionamento, nome, voz, promessa | `founder-brand` (e o resto do pacote `founder-*`) | Para quem é, o que promete, qual o tom. Alimenta o `/kickoff` e a copy da landing. |
| Uma decisão de layout precisa de evidência | `thinkui` (MCP pago, opcional) | Como produtos reais resolveram aquele mesmo problema (paywall, estado vazio, tabela densa). |
| Desenhar ou redesenhar uma tela | `anti-ui-slop` (Uizze) | O roteiro: ler o que existe, escolher o propósito da superfície, escrever o contrato curto, cobrir os estados, renderizar e olhar. |
| Corrigir o viés genérico de IA | `design-taste-frontend-v1` (Taste Skill) | Os três mostradores (variação, movimento, densidade) e a lista de "tells" proibidos. Só roda chamada por nome (`/design-taste-frontend-v1`); os mostradores e as proibições que valem aqui já estão na seção 2 e na seção 4. |
| Movimento, toque, polimento | `emil-design-eng`, `animate`, `choreograph`, `review-animations`, `improve-animations`, `remove-animations`, `animation-performance`, `break-ui`, `mobile-native`, `ask-sonner`, `pick-ui-library` (Emil Kowalski) | Se algo anima, com que curva e duração, como reage ao toque, qual lib usar. |
| Revisar o código de UI | `web-design-guidelines` (Vercel) | Acessibilidade, foco, formulários, tipografia, i18n, hidratação. Saída em `arquivo:linha`. |
| Fechar a tela | `thinkui-anti-slop` (gate) | Seis perguntas respondidas em uma linha cada (seção 5). |

`frontend-design` e `ui-ux-pro-max`, que já estavam no repositório, continuam úteis para explorar
direções e consultar paletas. Onde uma delas divergir deste documento, vale este documento.

Procedência e licença de cada uma estão em [`AI-WORKFLOW.md`](AI-WORKFLOW.md#baixadas-da-comunidade-design).

Duas skills dependem de serviço pago e são opcionais: a `thinkui` (MCP em `https://thinkui.xyz/mcp`)
e a parte de referências da `anti-ui-slop` (MCP do Uizze). Sem a chave, as duas continuam úteis
pelas regras e pelo gate; o que se perde é a consulta a telas reais. Quem tem chave conecta por
pessoa, nunca no repositório:

```bash
claude mcp add --scope user --transport http thinkui https://thinkui.xyz/mcp \
  --header "Authorization: Bearer $THINKUI_KEY"
```

A versão 2.5 da Taste Skill (kit de landing com fotos, scripts e gate em Chrome, 39 MB) não está no
repositório pelo peso. Quem vai construir uma landing do zero instala por pessoa:
`/plugin marketplace add Leonxlnx/taste-skill`. O que está versionado é a v1, que cabe num arquivo e
fala de produto e painel.

## 2. Direção do boilerplate

O painel (`apps/app`) é uma superfície de **operação**: a pessoa entra para fazer uma tarefa e sair.
A landing (`apps/web`) é de **persuasão**: diz o que é vendido, para quem, e leva a uma ação.

| Mostrador (Taste) | Painel | Landing |
|-------------------|--------|---------|
| `DESIGN_VARIANCE` | 3: grade previsível, alinhamento à esquerda | 6: hero dividido, blocos com proporções diferentes |
| `MOTION_INTENSITY` | 3: só hover, press e troca de estado | 4: entrada única do hero, nada animado no scroll |
| `VISUAL_DENSITY` | 6: tabelas compactas, agrupamento por espaço e linha | 3: respiro, uma ideia por bloco |

O que isso dá na prática:

- **Um acento só.** Neutros frios de baixo croma (matiz 264) e um azul cobalto como `--primary`.
  Nada de violeta, gradiente em texto, brilho neon ou cor saturada demais.
- **Tipografia Geist.** Geist Sans para tudo, Geist Mono com `tabular-nums` para números que se
  comparam (tabela, métrica, preço). Títulos com `tracking-tight` e `text-balance`; parágrafos com
  `text-pretty` e no máximo `65ch`. Serifa nunca no painel.
- **Profundidade por sombra fina, não por caixa.** Cartão é branco sobre um fundo levemente
  acinzentado, com anel de 1 px translúcido e sombra difusa. Dentro do cartão, agrupe por espaço e
  `divide-y`, não por outro cartão. No máximo dois níveis de caixa.
- **Um elemento vence por tela.** Título, número principal ou ação primária: um deles. O resto recua
  por tamanho, peso e cor, não por mais cor.

## 3. Tokens

Tudo mora em `packages/design-system/styles/globals.css`. Componente usa o token, nunca o valor.

### Cor

| Papel | Token | Uso |
|-------|-------|-----|
| Fundo da página | `--background` | Fundo do app e da landing. No claro é off-white, nunca `#fff` puro. |
| Superfície elevada | `--card`, `--popover` | Cartões, menus, diálogos. Mais claros que o fundo nos dois temas. |
| Texto | `--foreground`, `--muted-foreground` | Corpo e texto de apoio. Nunca preto puro. |
| Ação e marca | `--primary`, `--primary-foreground`, `--ring` | Botão principal, link, foco, item ativo do menu, série 1 dos gráficos. |
| Hover neutro | `--accent`, `--secondary`, `--muted` | Fundo de hover, botão secundário, cabeçalho de tabela. |
| Semânticas | `--destructive`, `--success`, `--warning` | Erro, sucesso, atenção. Sempre acompanhadas de ícone ou texto, nunca só a cor. |
| Linhas | `--border`, `--input` | Divisórias e borda de campo. |
| Gráficos | `--chart-1` a `--chart-5` | Cobalto, azul-petróleo, âmbar, grafite e rosa. Sem violeta. |

`packages/design-system/__tests__/themeContrast.test.ts` reprova o build se um par de texto ficar
abaixo de 4,5:1 nos dois temas. Mexeu em cor, rode `pnpm --filter @repo/design-system test`.

### Forma e elevação

- `--radius: 0.75rem`. Campo e botão usam `rounded-md` (10 px), cartão `rounded-xl` (16 px), pílula só
  em badge e avatar. Raio interno = raio externo menos o padding.
- `--shadow-card`, `--shadow-popover` e `--shadow-overlay` são as três elevações. No escuro a
  elevação vem do tom da superfície e de um anel branco de 6 a 8 % de opacidade.

### Movimento

| Token | Valor | Quando |
|-------|-------|--------|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Tudo que entra ou sai: popover, menu, diálogo, toast. |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Algo que já está na tela e muda de lugar ou tamanho. |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet e drawer. |
| `--duration-press` | `140ms` | Feedback de clique. |
| `--duration-fast` | `180ms` | Tooltip, popover, menu. |
| `--duration-base` | `240ms` | Diálogo, sheet. |

`ease-in` não entra em interface. Elemento de UI fica abaixo de 300 ms; diálogo, drawer e toast podem
chegar a 500 ms.

## 4. Regras de componente

Estas regras já estão aplicadas no `@repo/design-system`. Componente novo segue as mesmas.

### Interação

- **Press.** Todo elemento clicável encolhe para `scale(0.97)` no `:active`, com
  `transition: transform var(--duration-press) var(--ease-out)`. É o que dá a sensação de que a
  interface ouviu.
- **Hover só com ponteiro fino.** Efeito de hover que move ou escala fica dentro de
  `@media (hover: hover) and (pointer: fine)` (no Tailwind v4, o `hover:` já faz isso). Toque não tem hover.
- **Nunca `transition-all`.** Liste as propriedades. Anime só `transform` e `opacity`; cor e sombra
  podem ter transição curta.
- **Popover nasce do gatilho.** Menu, popover, tooltip e select usam
  `origin-(--radix-…-transform-origin)` e entram de `scale(0.96)` com opacidade, nunca de `scale(0)`.
  Diálogo é a exceção: fica centrado.
- **Nada anima em ação de teclado.** Abrir a paleta de comandos, navegar lista com seta, atalho: tudo
  instantâneo.
- **Nada aparece no scroll.** Sem fade-in por seção, sem parallax em texto, sem stagger em lista que
  carrega dados. A landing tem uma entrada única no hero, no carregamento.
- **`prefers-reduced-motion`.** O `globals.css` zera deslocamento e escala e mantém só opacidade
  curta. Não crie animação que ignore isso.
- **Foco visível sempre.** `focus-visible:ring-[3px] ring-ring/40` no padrão. `outline-none` só com
  essa troca. Barra fixa não cobre o campo focado (ver `data-sticky-action-bar` no
  [`apps/app/CLAUDE.md`](../apps/app/CLAUDE.md)).

### Bibliotecas (escolhas fixas)

| Necessidade | Use | Não use |
|-------------|-----|---------|
| Toast | `sonner`, via `useAlert()` | `react-toastify`, toast feito à mão |
| Menu, diálogo, popover, select | Radix / Base UI dos componentes em `components/ui` | `div` com `onClick` e foco manual |
| Tabela | `Table` do design system (HTML semântico, sem dependência externa) | lib de grid pesada para listas de MVP |
| Drawer | `vaul` (`components/ui/drawer`) | |
| Paleta de comandos | `cmdk` (`components/ui/command`) | |
| Gráfico | `recharts` (`components/ui/chart`) | |
| Ícone | `lucide-react`, traço único | emoji em código, texto ou `alt` |

Antes de instalar outra lib, consulte `pick-ui-library`.

### Peças do painel

Estão em `apps/app/shared/components/ui/` e já seguem o contrato. Tela nova monta com elas antes de
desenhar a própria.

| Peça | Para quê |
|------|----------|
| `PageHeader` | O único `h1` da tela, a descrição e a ação primária à direita. |
| `MetricStrip` | Indicadores no topo: uma faixa com células separadas por linha, não um cartão por número. |
| `SettingsSection` | Bloco de configuração com título, descrição e tom destrutivo para o que não volta atrás. |
| `FormSurface` | O cartão de um formulário de página inteira. |
| `Table` (`variant="flush"` dentro de cartão) | Lista com busca, atualizar, paginação, esqueleto e vazio. |
| `RecordAvatar` | Iniciais quando o registro não tem foto. |
| `LoadErrorState` (`onRetry`) | O erro de carga com "Tentar de novo". |

### Estados que toda tela com dados tem

| Estado | Como | Componente |
|--------|------|------------|
| Carregando | Esqueleto com o formato do conteúdo, não spinner solto | `PageSkeleton`, `TableSkeleton`, `FormSkeleton` |
| Vazio | Ícone, frase que diz o que falta e a primeira ação | `Empty` |
| Erro | O que falhou e um botão de tentar de novo | `LoadErrorState` |
| Excesso | Nome três vezes maior, número de nove dígitos, 60 linhas no celular | `truncate`, `min-w-0`, `break-words`; teste com `break-ui` |

### Conteúdo

- Texto de interface vem do dicionário (`/i18n-sync`), nos três idiomas.
- Carregamento termina em reticências de um caractere: "Salvando…", nunca "Salvando...".
- Botão diz verbo e objeto: "Salvar alterações", "Convidar membro". Mensagem de erro diz o que fazer.
- Data e número com `Intl` (os helpers de `@repo/shared` já fazem isso).
- Sem dado inventado com cara de real: "John Doe", "Acme", "99,99 %", depoimento de ninguém.

## 5. O gate antes de dizer "pronto"

Responda em uma linha cada. Um "não" é o trabalho que falta, não motivo para baixar a régua.

1. **Específico.** A tela faria sentido no produto de um concorrente sem mudar nada? Se sim, ainda
   não tem nada deste produto nela.
2. **Evidência.** Que decisão uma referência resolveu (ThinkUI, Uizze ou tela real que você abriu)?
   Sem chave, diga que o passo foi pulado.
3. **Estados.** Vazio, carregando, erro e excesso foram vistos com conteúdo real?
4. **Conteúdo.** Sobrou nome de exemplo ou número redondo falso no markup?
5. **Hierarquia.** Qual elemento vence? Um estranho apontaria o mesmo?
6. **Limites.** O que não foi renderizado, testado ou corrigido?

Depois do gate, a revisão de código roda `web-design-guidelines` nos arquivos tocados, e o `/test`
percorre a tela com `agent-browser` em claro, escuro, 390 px e 1440 px, nos três idiomas (regra de
ouro 11 do [`CLAUDE.md`](../CLAUDE.md)).

## 6. Trocar a marca num fork

O contrato não muda; a marca sim. Em ordem:

1. Rode o pacote `founder-*` (pelo menos `founder-board`, `founder-competitors` e `founder-brand`) ou
   o `/kickoff`, que já pede marca, tom e referências. O `docs/product/DESIGN-PROMPT.md` gerado leva
   este contrato para o Claude Design.
2. Troque `--primary`, `--ring`, `--sidebar-primary` e `--chart-1` nos dois temas de `globals.css`.
   Mantenha os neutros na mesma matiz do primário (croma baixo) para os cinzas não brigarem com a
   marca.
3. Ajuste `--radius` só se a marca pedir: `0.5rem` para fintech e ferramenta de dev, `1rem` para
   produto de consumo.
4. Fonte própria só com licença. Troque em `packages/design-system/lib/fonts.ts`; o resto do sistema
   lê `--font-sans` e `--font-mono`.
5. Rode `pnpm --filter @repo/design-system test` (contraste) e espelhe as cores em
   `packages/email/brand.ts`, que precisa de hex.

O passo a passo completo do fork, com ícones e variáveis de ambiente, está em
[`FORKING.md`](FORKING.md#3-identidade-do-produto).
