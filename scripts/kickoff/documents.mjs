// Pure module: runs in Node (the kickoff server writes the files) and in the
// browser (the page previews the same text before saving). No Node imports.

export const KICKOFF_VERSION = 1;

export const PRODUCT_DIR = "docs/product";

export const CORE_FEATURES = [
    {
        id: "onboarding",
        label: "Onboarding (nome e idioma no primeiro acesso)",
        env: 'ONBOARDING_ENABLED="false" desliga',
        defaultOn: true,
    },
    {
        id: "payments",
        label: "Assinaturas com Stripe (planos, checkout, portal)",
        env: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, catálogo na Stripe",
        defaultOn: false,
    },
    {
        id: "organizations",
        label: "Organizações com membros e convites (B2B)",
        env: 'NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"',
        defaultOn: false,
    },
    {
        id: "notifications",
        label: "Notificações no sino do painel",
        env: "índices de notification e TTL em expiresAt",
        defaultOn: true,
    },
    {
        id: "uploads",
        label: "Upload de arquivos (Cloud Storage)",
        env: "bucket do Firebase Storage ativado",
        defaultOn: false,
    },
    {
        id: "magicLink",
        label: "Login por link no e-mail",
        env: 'EMAIL_LINK_SIGN_IN_ENABLED="true" na api e "Link de e-mail" no console',
        defaultOn: false,
    },
    {
        id: "emails",
        label: "E-mails transacionais (Resend)",
        env: "RESEND_TOKEN, RESEND_FROM",
        defaultOn: true,
    },
    {
        id: "analytics",
        label: "Google Analytics com consentimento",
        env: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
        defaultOn: false,
    },
];

export const FIELD_TYPES = [
    "texto",
    "texto longo",
    "número",
    "dinheiro",
    "data",
    "sim/não",
    "lista de opções",
    "e-mail",
    "arquivo",
    "referência",
];

export const ACCESS_LEVELS = {
    owner: "só o dono do registro",
    organization: "membros da organização",
    admin: "só o admin",
    public: "público (landing)",
};

export const PANELS = {
    web: "Landing (apps/web)",
    app: "Painel do usuário (apps/app)",
    admin: "Painel do admin (apps/app)",
};

export const STYLE_PRESETS = {
    minimal:
        "minimalista, muito espaço em branco, poucas cores, tipografia em destaque",
    corporate: "corporativo e sóbrio, densidade média, foco em tabelas e dados",
    friendly: "amigável, cantos arredondados, ilustrações leves, cores quentes",
    bold: "marcante, contraste alto, títulos grandes, cor principal saturada",
};

export const createEmptyKickoff = () => ({
    version: KICKOFF_VERSION,
    product: {
        name: "",
        tagline: "",
        problem: "",
        audience: "",
        valueProposition: "",
        mode: "subscription",
        pricing: "",
        successMetric: "",
        outOfScope: "",
        competitors: "",
        defaultLocale: "pt-br",
    },
    features: Object.fromEntries(
        CORE_FEATURES.map((feature) => [feature.id, feature.defaultOn])
    ),
    roles: [
        { name: "Usuário", description: "Usa o produto no painel comum." },
        {
            name: "Admin",
            description: "Gerencia usuários e acompanha a operação.",
        },
    ],
    rules: "",
    entities: [],
    flows: [],
    screens: [],
    brand: {
        primaryColor: "#18181b",
        accentColor: "#f4f4f5",
        radius: "md",
        font: "Geist",
        style: "minimal",
        tone: "",
        references: "",
        logoUrl: "",
    },
});

const RADIUS_REM = { none: "0rem", sm: "0.375rem", md: "0.625rem", lg: "1rem" };

export const radiusToRem = (radius) => RADIUS_REM[radius] ?? RADIUS_REM.md;

const SLUG_INVALID = /[^a-z0-9]+/g;
const SLUG_EDGES = /(^-|-$)/g;
const DIACRITICS = /[\u0300-\u036f]/g;
const LIST_MARKER = /^[-*]\s*/;

export const slugify = (value) =>
    String(value ?? "")
        .normalize("NFD")
        .replace(DIACRITICS, "")
        .toLowerCase()
        .replace(SLUG_INVALID, "-")
        .replace(SLUG_EDGES, "");

const text = (value, fallback = "_a definir_") => {
    const trimmed = String(value ?? "").trim();
    return trimmed === "" ? fallback : trimmed;
};

const cell = (value) =>
    text(value, "").replaceAll("|", "\\|").replaceAll("\n", " ");

const bulletLines = (value) =>
    String(value ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line.replace(LIST_MARKER, "")}`)
        .join("\n");

const entityName = (entities, id) =>
    entities.find((entity) => entity.id === id)?.name ?? id;

const header = (title, productName) =>
    `# ${title}: ${text(productName, "produto sem nome")}\n\n` +
    "> Gerado pelo kickoff (`pnpm kickoff`) a partir de `kickoff.json`. Edite pelo formulário; " +
    "mudanças feitas direto neste arquivo se perdem no próximo salvamento.\n";

export const buildProductDoc = (kickoff) => {
    const { product, features, roles, rules } = kickoff;
    const featureRows = CORE_FEATURES.map(
        (feature) =>
            `| ${feature.label} | ${features[feature.id] ? "sim" : "não"} | ${feature.env} |`
    ).join("\n");
    const roleRows = roles
        .map((role) => `| ${cell(role.name)} | ${cell(role.description)} |`)
        .join("\n");

    return `${header("Produto", product.name)}
## Ideia

**${text(product.name)}**: ${text(product.tagline)}

| | |
|---|---|
| Problema | ${cell(product.problem) || "_a definir_"} |
| Para quem | ${cell(product.audience) || "_a definir_"} |
| Proposta de valor | ${cell(product.valueProposition) || "_a definir_"} |
| Modo do produto | \`${product.mode}\` (\`NEXT_PUBLIC_PRODUCT_MODE\`) |
| Cobrança | ${cell(product.pricing) || "_a definir_"} |
| Métrica de sucesso | ${cell(product.successMetric) || "_a definir_"} |
| Idioma padrão | \`${product.defaultLocale}\` (\`NEXT_PUBLIC_DEFAULT_LOCALE\`) |

### Fora do MVP

${bulletLines(product.outOfScope) || "_a definir_"}

### Concorrentes e referências

${bulletLines(product.competitors) || "_nenhum informado_"}

## Recursos do core usados

| Recurso | Ligado | Configuração |
|---------|--------|--------------|
${featureRows}

## Papéis

| Papel | O que faz |
|-------|-----------|
${roleRows || "| _a definir_ | |"}

## Regras de negócio

${bulletLines(rules) || "_a definir_"}
`;
};

const MERMAID_TYPES = {
    texto: "string",
    "texto longo": "string",
    número: "number",
    dinheiro: "number",
    data: "date",
    "sim/não": "boolean",
    "lista de opções": "enum",
    "e-mail": "string",
    arquivo: "file",
    referência: "ref",
};

const RELATION_MERMAID = {
    "1-n": "||--o{",
    "n-1": "}o--||",
    "n-n": "}o--o{",
    "1-1": "||--||",
};

const RELATION_LABEL = {
    "1-n": "um para muitos",
    "n-1": "muitos para um",
    "n-n": "muitos para muitos",
    "1-1": "um para um",
};

const STEM_MIN_LENGTH = 6;
const STEM_TRIM = 2;

// Portuguese plurals change the end of the word (profissional → profissionais), so a
// long name is matched by its stem; short names must match whole.
const nameStem = (name) => {
    const slug = slugify(name);
    return slug.length >= STEM_MIN_LENGTH ? slug.slice(0, -STEM_TRIM) : slug;
};

const mentions = (sentence, name) => {
    const stem = nameStem(name);
    if (!stem) {
        return false;
    }
    return slugify(sentence)
        .split("-")
        .some((word) => word.startsWith(stem));
};

const relatedPairKey = (a, b) => [a, b].sort().join("|");

/**
 * Relations the user implied by naming another entity in an entity's role, minus the
 * pairs already linked by an explicit relation. The /kickoff command confirms them and
 * picks the cardinality.
 */
export const inferMentions = (entities) => {
    const linked = new Set(
        entities.flatMap((entity) =>
            entity.relations.map((relation) =>
                relatedPairKey(entity.id, relation.target)
            )
        )
    );
    const found = new Map();
    for (const entity of entities) {
        for (const other of entities) {
            const key = relatedPairKey(entity.id, other.id);
            if (
                other.id !== entity.id &&
                !linked.has(key) &&
                !found.has(key) &&
                mentions(entity.role, other.name)
            ) {
                found.set(key, { from: entity.id, to: other.id });
            }
        }
    }
    return [...found.values()];
};

const mermaidId = (entity) =>
    slugify(entity.name).replaceAll("-", "_") || entity.id;

const buildErDiagram = (entities) => {
    if (entities.length === 0) {
        return "";
    }
    const blocks = entities.map((entity) => {
        const fields = entity.fields
            .filter((field) => field.name)
            .map(
                (field) =>
                    `        ${MERMAID_TYPES[field.type] ?? "string"} ${slugify(field.name).replaceAll("-", "_")}`
            )
            .join("\n");
        return `    ${mermaidId(entity)} {\n${fields || "        string id"}\n    }`;
    });
    const relations = entities.flatMap((entity) =>
        entity.relations
            .filter((relation) =>
                entities.some((other) => other.id === relation.target)
            )
            .map((relation) => {
                const target = entities.find(
                    (other) => other.id === relation.target
                );
                return `    ${mermaidId(entity)} ${RELATION_MERMAID[relation.kind] ?? RELATION_MERMAID["1-n"]} ${mermaidId(target)} : "${relation.kind}"`;
            })
    );
    const implied = inferMentions(entities).map(({ from, to }) => {
        const source = entities.find((entity) => entity.id === from);
        const target = entities.find((entity) => entity.id === to);
        return `    ${mermaidId(source)} }o..o{ ${mermaidId(target)} : "a confirmar"`;
    });
    return `\`\`\`mermaid\nerDiagram\n${[...blocks, ...relations, ...implied].join("\n")}\n\`\`\`\n`;
};

export const buildDomainDoc = (kickoff) => {
    const { entities, flows, product } = kickoff;
    const entitySections = entities
        .map((entity) => {
            const fieldRows = entity.fields
                .map(
                    (field) =>
                        `| ${cell(field.name)} | ${field.type} | ${field.required ? "sim" : "não"} | ${cell(field.notes)} |`
                )
                .join("\n");
            const relations = entity.relations
                .filter((relation) =>
                    entities.some((other) => other.id === relation.target)
                )
                .map(
                    (relation) =>
                        `- ${RELATION_LABEL[relation.kind] ?? relation.kind} com **${entityName(entities, relation.target)}**`
                )
                .join("\n");
            const details = fieldRows
                ? `Quem acessa: ${ACCESS_LEVELS[entity.access] ?? ACCESS_LEVELS.owner}.

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
${fieldRows}
`
                : "_Campos, tipos, acesso e relações a propor pelo `/kickoff` a partir do papel._\n";
            return `### ${text(entity.name)}${entity.codeName ? ` (\`${entity.codeName}\`)` : ""}

**Papel no sistema:** ${text(entity.role)}

${details}
${relations ? `Relações:\n\n${relations}\n` : ""}`;
        })
        .join("\n");
    const flowSections = flows
        .map(
            (flow) =>
                `### ${text(flow.name)}\n\n${bulletLines(flow.steps) || "_a definir_"}\n`
        )
        .join("\n");

    return `${header("Domínio", product.name)}
## Diagrama

${buildErDiagram(entities) || "_Nenhuma entidade cadastrada._\n"}
## Entidades

${entitySections || "_Nenhuma entidade cadastrada._\n"}
## Fluxos principais

${flowSections || "_Nenhum fluxo cadastrado._\n"}`;
};

export const buildScreensDoc = (kickoff) => {
    const { screens, entities, product } = kickoff;
    const rows = screens
        .map(
            (screen) =>
                `| ${cell(screen.name)} | \`${cell(screen.route)}\` | ${PANELS[screen.panel] ?? screen.panel} | ${screen.entityId ? entityName(entities, screen.entityId) : "-"} |`
        )
        .join("\n");
    const sections = screens
        .map((screen) => {
            const states = (screen.states ?? []).join(", ") || "padrão";
            const design = screen.design
                ? `\n![${cell(screen.name)}](screens/${screen.design})\n`
                : "\nDesign: _ainda não anexado._\n";
            return `### ${text(screen.name)}

- Rota: \`${text(screen.route)}\`
- Onde: ${PANELS[screen.panel] ?? screen.panel}
- Objetivo: ${text(screen.purpose)}
- Estados a desenhar: ${states}
${screen.notes ? `- Observações: ${screen.notes.trim()}\n` : ""}${design}`;
        })
        .join("\n");

    return `${header("Telas", product.name)}
| Tela | Rota | Onde | Entidade |
|------|------|------|----------|
${rows || "| _a definir_ | | | |"}

${sections || "_Nenhuma tela cadastrada._\n"}`;
};

const DESIGN_SYSTEM_COMPONENTS =
    "accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, button-group, calendar, " +
    "card, chart, checkbox, combobox, command, date-input, dialog, drawer, dropdown-menu, empty, " +
    "field, form, hover-card, input, input-group, input-otp, kbd, label, navigation-menu, " +
    "pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar, " +
    "skeleton, slider, sonner (toast), spinner, switch, table, tabs, textarea, toggle, tooltip";

export const buildDesignPrompt = (kickoff) => {
    const { product, brand, screens, entities } = kickoff;
    const screenLines = screens
        .map((screen, index) => {
            const entity = entities.find((item) => item.id === screen.entityId);
            const fieldNames = (entity?.fields ?? [])
                .map((field) => field.name)
                .filter(Boolean);
            let fields = "";
            if (fieldNames.length > 0) {
                fields = ` Dados: ${fieldNames.join(", ")}.`;
            } else if (entity) {
                fields = ` Dados de ${text(entity.name)}: ${text(entity.role)}.`;
            }
            const states = (screen.states ?? []).length
                ? ` Estados: ${screen.states.join(", ")}.`
                : "";
            return `${index + 1}. **${text(screen.name)}** (\`${text(screen.route)}\`, ${PANELS[screen.panel] ?? screen.panel}): ${text(screen.purpose)}.${fields}${states}`;
        })
        .join("\n");

    return `# Prompt de design: ${text(product.name, "produto sem nome")}

> Gerado pelo kickoff. Cole o bloco abaixo no Claude Design (ou na ferramenta de design que for usar).
> Quando as telas voltarem, anexe cada uma no passo "Telas" do \`pnpm kickoff\`.

\`\`\`text
Você vai desenhar as telas do MVP de "${text(product.name, "produto sem nome")}".

## Produto
- O que é: ${text(product.tagline)}
- Problema que resolve: ${text(product.problem)}
- Para quem: ${text(product.audience)}
- Tom de voz: ${text(brand.tone, "direto e cordial")}

## Direção visual
- Estilo: ${STYLE_PRESETS[brand.style] ?? brand.style}
- Cor principal: ${brand.primaryColor}; cor de apoio: ${brand.accentColor}
- Raio dos cantos: ${radiusToRem(brand.radius)}
- Fonte: ${text(brand.font, "Geist")} (sans) e Geist Mono para números e código
- Referências: ${text(brand.references, "nenhuma")}

## Restrições técnicas (obrigatórias)
- A implementação usa shadcn/ui sobre Tailwind v4, com tokens em variáveis CSS. Use só estes
  componentes: ${DESIGN_SYSTEM_COMPONENTS}. Se precisar de algo fora da lista, dê um nome e descreva.
- Entregue os tokens em oklch, para tema claro e escuro, com estes nomes: --background,
  --foreground, --card, --card-foreground, --popover, --popover-foreground, --primary,
  --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground,
  --accent, --accent-foreground, --destructive, --success, --warning, --border, --input, --ring,
  --radius, --sidebar, --sidebar-foreground, --sidebar-primary, --sidebar-primary-foreground,
  --sidebar-accent, --sidebar-accent-foreground, --sidebar-border, --sidebar-ring e --chart-1 a --chart-5.
- Painel (app e admin): barra lateral recolhível à esquerda; cabeçalho com breadcrumb, seletor de
  painel, idioma (pt-br, en, es), alternância de tema e menu do avatar. O conteúdo começa com o
  breadcrumb e o título da página.
- Formulários: centralizados na área de conteúdo, largura máxima de 56rem, rótulo acima do campo,
  asterisco nos obrigatórios, erro abaixo do campo, barra de ações fixa no rodapé com "Voltar" e
  "Salvar". O cartão do formulário tem a altura do conteúdo.
- Listas: tabela com busca, botão de atualizar, paginação e menu de ações por linha; estado vazio
  com ilustração leve e um botão de criar.
- Celular primeiro: cada tela em 390 px e em 1440 px. Alvos de toque com pelo menos 24 px.
- Acessibilidade WCAG 2.2 AA: contraste de 4,5:1 no texto, foco visível, nada que dependa só de cor.
- Os textos existem em três idiomas; deixe folga de 30% na largura para inglês e espanhol.

## Telas
${screenLines || "(nenhuma tela cadastrada ainda)"}

## Entregáveis
1. Os tokens dos dois temas, prontos para colar num arquivo CSS.
2. Um quadro por tela, em 1440 px e 390 px, tema claro e escuro, incluindo os estados listados.
3. Para cada tela, a lista dos componentes usados.
\`\`\`
`;
};

export const buildDocuments = (kickoff) => ({
    "PRODUCT.md": buildProductDoc(kickoff),
    "DOMAIN.md": buildDomainDoc(kickoff),
    "SCREENS.md": buildScreensDoc(kickoff),
    "DESIGN-PROMPT.md": buildDesignPrompt(kickoff),
});

export const normalizeKickoff = (input) => {
    const empty = createEmptyKickoff();
    const source = input && typeof input === "object" ? input : {};
    return {
        ...empty,
        ...source,
        version: KICKOFF_VERSION,
        product: { ...empty.product, ...source.product },
        features: { ...empty.features, ...source.features },
        brand: { ...empty.brand, ...source.brand },
        roles: Array.isArray(source.roles) ? source.roles : empty.roles,
        entities: (Array.isArray(source.entities) ? source.entities : []).map(
            (entity) => ({
                fields: [],
                relations: [],
                access: "owner",
                role: entity.description ?? "",
                ...entity,
            })
        ),
        flows: Array.isArray(source.flows) ? source.flows : [],
        screens: (Array.isArray(source.screens) ? source.screens : []).map(
            (screen) => ({ states: [], panel: "app", ...screen })
        ),
    };
};
