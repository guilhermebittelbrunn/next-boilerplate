import {
    ACCESS_LEVELS,
    buildDocuments,
    CORE_FEATURES,
    createEmptyKickoff,
    FIELD_TYPES,
    inferMentions,
    normalizeKickoff,
    PANELS,
    radiusToRem,
    STYLE_PRESETS,
    slugify,
} from "/documents.mjs";

const DRAFT_KEY = "kickoff:draft";
const THEME_KEY = "kickoff:theme";
const CLAUDE_DESIGN_URL = "https://claude.ai/design";
const DATA_URL_PREFIX = /^data:[^,]*,/;
const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const LUMINANCE_THRESHOLD = 0.55;
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const LUMINANCE_WEIGHTS = [RED_WEIGHT, GREEN_WEIGHT, BLUE_WEIGHT];
const HEX_PAIR = /.{2}/g;
const ID_ALPHABET_RADIX = 36;
const ID_LENGTH = 6;

const STEPS = [
    {
        id: "product",
        label: "Produto",
        hint: "Como a landing apresentaria a ideia",
    },
    {
        id: "features",
        label: "Recursos e regras",
        hint: "O que o core já entrega ligado",
    },
    { id: "domain", label: "Domínio", hint: "Entidades e relações, ao vivo" },
    {
        id: "screens",
        label: "Telas",
        hint: "Arraste o design de cada tela para o quadro",
    },
    {
        id: "brand",
        label: "Marca",
        hint: "Tokens aplicados nos temas claro e escuro",
    },
    {
        id: "review",
        label: "Revisar",
        hint: "Os documentos que o Salvar grava",
    },
];

const SCREEN_STATES = [
    "vazio",
    "carregando",
    "erro",
    "sucesso",
    "sem permissão",
];
const FONTS = [
    "Geist",
    "Inter",
    "Manrope",
    "DM Sans",
    "IBM Plex Sans",
    "Nunito",
];
const RADII = [
    ["none", "Reto"],
    ["sm", "Pequeno"],
    ["md", "Médio"],
    ["lg", "Grande"],
];
const RELATION_KINDS = [
    ["1-n", "tem muitos"],
    ["n-1", "pertence a"],
    ["n-n", "muitos para muitos"],
    ["1-1", "um para um"],
];

const state = {
    kickoff: createEmptyKickoff(),
    step: "product",
    dirty: false,
    docTab: "PRODUCT.md",
    uploadTarget: null,
    savedKickoff: null,
    openDetails: new Set(),
    cacheBuster: Date.now(),
};

const byId = (id) => document.getElementById(id);

const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const getAt = (path) =>
    path.split(".").reduce((value, key) => value?.[key], state.kickoff);

const setAt = (path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((node, key) => node[key], state.kickoff);
    target[last] = value;
};

const newId = (prefix) =>
    `${prefix}-${Math.random()
        .toString(ID_ALPHABET_RADIX)
        .slice(2, 2 + ID_LENGTH)}`;

const options = (pairs, selected) =>
    pairs
        .map(
            ([value, label]) =>
                `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`
        )
        .join("");

const inputField = ({
    path,
    label,
    hint = "",
    type = "text",
    wide = false,
    placeholder = "",
}) =>
    `<label class="field${wide ? " wide" : ""}"><span>${label}</span>
        <input data-path="${path}" type="${type}" value="${escapeHtml(getAt(path))}" placeholder="${escapeHtml(placeholder)}" />
        ${hint ? `<small>${hint}</small>` : ""}</label>`;

const textareaField = ({ path, label, hint = "", placeholder = "" }) =>
    `<label class="field wide"><span>${label}</span>
        <textarea data-path="${path}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(getAt(path))}</textarea>
        ${hint ? `<small>${hint}</small>` : ""}</label>`;

const selectField = ({ path, label, pairs, rerender = false }) =>
    `<label class="field"><span>${label}</span>
        <select data-path="${path}"${rerender ? " data-rerender" : ""}>${options(pairs, getAt(path))}</select></label>`;

const panel = (title, description, body) =>
    `<div class="panel"><h2>${title}</h2><p>${description}</p>${body}</div>`;

const actionButton = (action, label, extra = "", variant = "") =>
    `<button type="button" class="button small ${variant}" data-action="${action}" ${extra}>${label}</button>`;

// ---------- Forms ----------

const renderProductForm = () =>
    panel(
        "A ideia",
        "Escreva como explicaria o produto para alguém em dois minutos. Tudo aqui vira o PRODUCT.md.",
        `<div class="grid">
            ${inputField({ path: "product.name", label: "Nome do produto", placeholder: "Ex.: Agendaí" })}
            ${inputField({ path: "product.tagline", label: "Frase de uma linha", placeholder: "Agenda online para salões" })}
            ${textareaField({ path: "product.problem", label: "Problema", placeholder: "Qual dor existe hoje, para quem, e o que acontece se nada mudar" })}
            ${textareaField({ path: "product.audience", label: "Para quem", placeholder: "Quem usa, quem paga, tamanho do cliente" })}
            ${textareaField({ path: "product.valueProposition", label: "Proposta de valor", placeholder: "Por que escolheriam este produto" })}
            ${inputField({ path: "product.pricing", label: "Como cobra", placeholder: "Ex.: R$ 49/mês por unidade, 14 dias grátis" })}
            ${inputField({ path: "product.successMetric", label: "Métrica de sucesso", placeholder: "Ex.: 20 salões pagantes em 60 dias" })}
            ${selectField({
                path: "product.defaultLocale",
                label: "Idioma padrão",
                pairs: [
                    ["pt-br", "Português"],
                    ["en", "Inglês"],
                    ["es", "Espanhol"],
                ],
            })}
            ${textareaField({ path: "product.outOfScope", label: "Fora do MVP", hint: "Uma linha por item.", placeholder: "App nativo\nIntegração com WhatsApp" })}
            ${textareaField({ path: "product.competitors", label: "Concorrentes e referências", hint: "Uma linha por item." })}
        </div>`
    );

const renderRoles = () =>
    state.kickoff.roles
        .map(
            (_role, index) => `<div class="row role-row">
                <input class="role-name" data-path="roles.${index}.name" value="${escapeHtml(state.kickoff.roles[index].name)}" placeholder="Papel" aria-label="Papel" />
                <input class="role-description" data-path="roles.${index}.description" value="${escapeHtml(state.kickoff.roles[index].description)}" placeholder="O que faz" aria-label="O que faz" />
                ${actionButton("remove-role", "Remover", `data-index="${index}"`, "danger")}
            </div>`
        )
        .join("");

const renderFeaturesForm = () => {
    const toggles = CORE_FEATURES.map(
        (feature) => `<label class="toggle">
            <input type="checkbox" data-path="features.${feature.id}"${state.kickoff.features[feature.id] ? " checked" : ""} />
            <span>${escapeHtml(feature.label)}<small>${escapeHtml(feature.env)}</small></span>
        </label>`
    ).join("");
    return (
        panel(
            "Modo e recursos do core",
            "O boilerplate já entrega estes recursos. Marque o que o produto usa; o resto fica desligado.",
            `<div class="grid">${selectField({
                path: "product.mode",
                label: "Onde o usuário opera",
                pairs: [
                    ["subscription", "No painel (subscription)"],
                    ["simple", "Na landing; painel só do admin (simple)"],
                ],
            })}</div><div class="grid" style="margin-top: 1rem">${toggles}</div>`
        ) +
        panel(
            "Papéis",
            "Quem usa o sistema e o que cada um pode fazer.",
            `<div class="form-column">${renderRoles()}<div class="row">${actionButton("add-role", "+ Papel")}</div></div>`
        ) +
        panel(
            "Regras de negócio",
            "Uma regra por linha. Ex.: um horário só pode ter um agendamento confirmado.",
            textareaField({ path: "rules", label: "Regras" })
        )
    );
};

const renderFieldRows = (entityIndex) =>
    state.kickoff.entities[entityIndex].fields
        .map((field, fieldIndex) => {
            const base = `entities.${entityIndex}.fields.${fieldIndex}`;
            return `<div class="field-row"><input data-path="${base}.name" value="${escapeHtml(field.name)}" placeholder="campo" aria-label="Nome do campo" />
                <select data-path="${base}.type" aria-label="Tipo">${options(
                    FIELD_TYPES.map((type) => [type, type]),
                    field.type
                )}</select>
                <input type="checkbox" data-path="${base}.required"${field.required ? " checked" : ""} aria-label="Obrigatório" />
                <input data-path="${base}.notes" value="${escapeHtml(field.notes)}" placeholder="observação" aria-label="Observação" />
                ${actionButton("remove-field", "×", `data-entity="${entityIndex}" data-index="${fieldIndex}" aria-label="Remover campo"`, "ghost")}</div>`;
        })
        .join("");

const renderRelationRows = (entityIndex) => {
    const { entities } = state.kickoff;
    const targets = entities
        .filter((_entity, index) => index !== entityIndex)
        .map((entity) => [entity.id, entity.name || "(sem nome)"]);
    return entities[entityIndex].relations
        .map((relation, relationIndex) => {
            const base = `entities.${entityIndex}.relations.${relationIndex}`;
            return `<div class="row">
                <select data-path="${base}.kind" style="max-width: 12rem">${options(RELATION_KINDS, relation.kind)}</select>
                <select data-path="${base}.target" style="flex: 1">${options([["", "escolha a entidade"], ...targets], relation.target)}</select>
                ${actionButton("remove-relation", "×", `data-entity="${entityIndex}" data-index="${relationIndex}" aria-label="Remover relação"`, "ghost")}
            </div>`;
        })
        .join("");
};

const detailsSummary = (entity) => {
    const fieldCount = entity.fields.length;
    const relationCount = entity.relations.length;
    if (fieldCount === 0 && relationCount === 0) {
        return "o /kickoff propõe campos, tipos, acesso e relações a partir do papel";
    }
    return `${fieldCount} campo(s), ${relationCount} relação(ões)`;
};

const renderEntity = (entity, index) => `<div class="item">
    <div class="item-header">
        <strong>${escapeHtml(entity.name) || "Nova entidade"}</strong>
        ${actionButton("remove-entity", "Remover", `data-index="${index}"`, "danger")}
    </div>
    <div class="grid">
        ${inputField({ path: `entities.${index}.name`, label: "Nome", placeholder: "Agendamento" })}
        ${textareaField({
            path: `entities.${index}.role`,
            label: "Papel no sistema",
            hint: "Cite as outras entidades pelo nome: o diagrama liga as que você mencionar.",
            placeholder:
                "Horário que o cliente marca com um profissional, num salão. O salão confirma ou recusa.",
        })}
    </div>
    <details class="details" data-entity-details="${escapeHtml(entity.id)}"${state.openDetails.has(entity.id) ? " open" : ""}>
        <summary>Detalhar campos e relações <small>(opcional) · ${detailsSummary(entity)}</small></summary>
        <div class="form-column">
            <div class="grid">${selectField({ path: `entities.${index}.access`, label: "Quem acessa", pairs: Object.entries(ACCESS_LEVELS) })}</div>
            ${
                entity.fields.length > 0
                    ? `<div class="field-table">
                <span class="head">Campo</span><span class="head">Tipo</span><span class="head">Obrig.</span><span class="head">Observação</span><span></span>
                ${renderFieldRows(index)}
            </div>`
                    : ""
            }
            <div class="row">${actionButton("add-field", "+ Campo", `data-entity="${index}"`)}</div>
            ${renderRelationRows(index)}
            <div class="row">${actionButton("add-relation", "+ Relação", `data-entity="${index}"`)}</div>
        </div>
    </details>
</div>`;

const renderFlow = (_flow, index) => `<div class="item">
    <div class="item-header">
        <input data-path="flows.${index}.name" value="${escapeHtml(state.kickoff.flows[index].name)}" placeholder="Nome do fluxo" />
        ${actionButton("remove-flow", "Remover", `data-index="${index}"`, "danger")}
    </div>
    <textarea data-path="flows.${index}.steps" placeholder="Um passo por linha">${escapeHtml(state.kickoff.flows[index].steps)}</textarea>
</div>`;

const renderDomainForm = () =>
    panel(
        "Entidades",
        "As coisas que o sistema guarda. Basta o nome e o papel de cada uma; o <code>/kickoff</code> propõe o resto e você confirma.",
        `<div class="form-column">${state.kickoff.entities.map(renderEntity).join("")}
            <div class="row">${actionButton("add-entity", "+ Entidade", "", "primary")}</div></div>`
    ) +
    panel(
        "Fluxos principais",
        "A jornada que precisa funcionar de ponta a ponta no MVP.",
        `<div class="form-column">${state.kickoff.flows.map(renderFlow).join("")}
            <div class="row">${actionButton("add-flow", "+ Fluxo")}</div></div>`
    );

const renderScreen = (screen, index) => {
    const entityPairs = [
        ["", "nenhuma"],
        ...state.kickoff.entities.map((entity) => [
            entity.id,
            entity.name || "(sem nome)",
        ]),
    ];
    const states = SCREEN_STATES.map(
        (name) =>
            `<label class="row"><input type="checkbox" data-screen-state="${index}" value="${name}"${screen.states.includes(name) ? " checked" : ""} /> ${name}</label>`
    ).join("");
    return `<div class="item">
        <div class="item-header">
            <strong>${escapeHtml(screen.name) || "Nova tela"}</strong>
            ${actionButton("remove-screen", "Remover", `data-index="${index}"`, "danger")}
        </div>
        <div class="grid">
            ${inputField({ path: `screens.${index}.name`, label: "Nome", placeholder: "Lista de agendamentos" })}
            ${inputField({ path: `screens.${index}.route`, label: "Rota", placeholder: "/agendamentos" })}
            ${selectField({ path: `screens.${index}.panel`, label: "Onde", pairs: Object.entries(PANELS) })}
            ${selectField({ path: `screens.${index}.entityId`, label: "Entidade", pairs: entityPairs })}
            ${textareaField({ path: `screens.${index}.purpose`, label: "Objetivo", placeholder: "O que a pessoa faz aqui" })}
            ${textareaField({ path: `screens.${index}.notes`, label: "Observações" })}
        </div>
        <div class="field"><span>Estados a desenhar</span><div class="chip-list">${states}</div></div>
    </div>`;
};

const renderScreensForm = () =>
    panel(
        "Telas",
        "Liste as telas do MVP. Depois de desenhar, arraste a imagem (ou o HTML exportado) para o quadro da tela na pré-visualização.",
        `<div class="form-column">${state.kickoff.screens.map(renderScreen).join("")}
            <div class="row">${actionButton("add-screen", "+ Tela", "", "primary")}${actionButton("suggest-screens", "Sugerir a partir das entidades")}</div></div>`
    );

const renderBrandForm = () =>
    panel(
        "Marca",
        "A direção visual que entra no prompt de design. As cores viram os tokens <code>--primary</code> e <code>--accent</code>.",
        `<div class="grid">
            ${inputField({ path: "brand.primaryColor", label: "Cor principal", type: "color" })}
            ${inputField({ path: "brand.accentColor", label: "Cor de apoio", type: "color" })}
            ${selectField({ path: "brand.radius", label: "Cantos", pairs: RADII })}
            ${selectField({ path: "brand.font", label: "Fonte", pairs: FONTS.map((font) => [font, font]) })}
            ${selectField({ path: "brand.style", label: "Estilo", pairs: Object.keys(STYLE_PRESETS).map((key) => [key, key]) })}
            ${inputField({ path: "brand.logoUrl", label: "URL do logo", hint: "Vira NEXT_PUBLIC_APP_LOGO_URL." })}
            ${textareaField({ path: "brand.tone", label: "Tom de voz", placeholder: "Próximo, sem jargão, frases curtas" })}
            ${textareaField({ path: "brand.references", label: "Referências visuais", hint: "Sites ou apps que você gostaria de lembrar. Uma por linha." })}
        </div>`
    );

const completeness = () => {
    const { product, entities, screens } = state.kickoff;
    return [
        ["Nome e frase do produto", Boolean(product.name && product.tagline)],
        ["Problema e público", Boolean(product.problem && product.audience)],
        [
            "Pelo menos uma entidade com papel descrito",
            entities.some((entity) => entity.role?.trim()),
        ],
        ["Pelo menos uma tela", screens.length > 0],
        [
            "Toda tela com rota",
            screens.length > 0 && screens.every((screen) => screen.route),
        ],
        [
            "Design anexado em toda tela",
            screens.length > 0 && screens.every((screen) => screen.design),
        ],
    ];
};

const checklistHtml = () =>
    `<ul class="checklist">${completeness()
        .map(([label, done]) => `<li data-done="${done}">${label}</li>`)
        .join("")}</ul>`;

const renderReviewForm = () =>
    panel(
        "Situação",
        "O que já está definido. Nada aqui é obrigatório para salvar.",
        checklistHtml()
    ) +
    panel(
        "Próximos passos",
        "O kickoff termina no Claude Code.",
        `<ol>
            <li>Salve. Os documentos vão para <code>docs/product/</code>.</li>
            <li>Copie o prompt de design (botão ao lado) e cole no Claude Design.</li>
            <li>Volte em <strong>Telas</strong> e arraste o design de cada tela para o quadro dela.</li>
            <li>No Claude Code, rode <code>/kickoff</code>: ele lê os documentos, pergunta o que faltar e gera as specs do MVP em <code>specs/features/</code>.</li>
        </ol>`
    );

const FORMS = {
    product: renderProductForm,
    features: renderFeaturesForm,
    domain: renderDomainForm,
    screens: renderScreensForm,
    brand: renderBrandForm,
    review: renderReviewForm,
};

// ---------- Previews ----------

const hexToRgb = (hex) => {
    const match = HEX_COLOR.exec(hex ?? "");
    if (!match) {
        return [0, 0, 0];
    }
    return match[1]
        .match(HEX_PAIR)
        .map((pair) => Number.parseInt(pair, HEX_RADIX));
};

const readableOn = (hex) => {
    const luminance = hexToRgb(hex).reduce(
        (sum, channel, index) =>
            sum + (channel / CHANNEL_MAX) * LUMINANCE_WEIGHTS[index],
        0
    );
    return luminance > LUMINANCE_THRESHOLD ? "#0a0a0a" : "#fafafa";
};

const brandVars = (dark) => {
    const { brand } = state.kickoff;
    const surface = dark
        ? { background: "#0a0a0a", foreground: "#fafafa", border: "#ffffff22" }
        : { background: "#ffffff", foreground: "#0a0a0a", border: "#e5e5e5" };
    return [
        `--b-background:${surface.background}`,
        `--b-foreground:${surface.foreground}`,
        `--b-border:${surface.border}`,
        `--b-primary:${brand.primaryColor}`,
        `--b-primary-foreground:${readableOn(brand.primaryColor)}`,
        `--b-accent:${brand.accentColor}`,
        `--b-accent-foreground:${readableOn(brand.accentColor)}`,
        `--b-radius:${radiusToRem(brand.radius)}`,
        `--b-font:'${escapeHtml(brand.font)}', ui-sans-serif, system-ui, sans-serif`,
    ].join(";");
};

const previewProduct = () => {
    const { product, brand } = state.kickoff;
    return `<div class="preview-card hero" style="${brandVars(false)};background:var(--b-background);color:var(--b-foreground);font-family:var(--b-font)">
            <h3>${escapeHtml(product.name) || "Nome do produto"}</h3>
            <p>${escapeHtml(product.tagline) || "A frase de uma linha aparece aqui."}</p>
            <p style="opacity:.7">${escapeHtml(product.valueProposition)}</p>
            <div class="row" style="justify-content:center;margin-top:1rem">
                <span class="b-button" style="padding:.5rem 1rem;border-radius:${radiusToRem(brand.radius)};background:${brand.primaryColor};color:${readableOn(brand.primaryColor)}">Começar agora</span>
            </div>
        </div>
        <div class="preview-card"><strong>Situação</strong>${checklistHtml()}</div>`;
};

const previewFeatures = () => {
    const enabled = CORE_FEATURES.filter(
        (feature) => state.kickoff.features[feature.id]
    );
    const roles = state.kickoff.roles
        .map((role) => `<span class="chip">${escapeHtml(role.name)}</span>`)
        .join("");
    return `<div class="preview-card"><strong>Ligados</strong><div class="chip-list" style="margin-top:.5rem">${
        enabled
            .map(
                (feature) =>
                    `<span class="chip">${escapeHtml(feature.label)}</span>`
            )
            .join("") || '<span class="empty">Nenhum</span>'
    }</div></div>
    <div class="preview-card"><strong>Variáveis a configurar</strong><ul>${enabled
        .map((feature) => `<li><code>${escapeHtml(feature.env)}</code></li>`)
        .join(
            ""
        )}<li><code>NEXT_PUBLIC_PRODUCT_MODE=${escapeHtml(state.kickoff.product.mode)}</code></li></ul></div>
    <div class="preview-card"><strong>Papéis</strong><div class="chip-list" style="margin-top:.5rem">${roles}</div></div>`;
};

const BOX_WIDTH = 200;
const BOX_GAP_X = 60;
const BOX_GAP_Y = 50;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 18;
const COLUMNS = 2;
const NARROW_PREVIEW_PX = 520;
const BOX_PADDING = 10;
const TEXT_BASELINE = 18;
const FIELD_BASELINE = 14;
const LABEL_OFFSET = 4;
const VIEWBOX_MARGIN = 10;

const ROLE_LINE_CHARS = 26;
const ROLE_MAX_LINES = 3;
const WHITESPACE = /\s+/;

const wrapRole = (role) => {
    const lines = [];
    for (const word of String(role ?? "")
        .trim()
        .split(WHITESPACE)
        .filter(Boolean)) {
        const last = lines.at(-1);
        if (last !== undefined && `${last} ${word}`.length <= ROLE_LINE_CHARS) {
            lines[lines.length - 1] = `${last} ${word}`;
        } else {
            lines.push(word);
        }
    }
    if (lines.length > ROLE_MAX_LINES) {
        return [
            ...lines.slice(0, ROLE_MAX_LINES - 1),
            `${lines[ROLE_MAX_LINES - 1]}…`,
        ];
    }
    return lines;
};

const boxLines = (entity) =>
    entity.fields.length > 0
        ? entity.fields.map((field) => ({
              text: `${field.name || "?"}${field.required ? " *" : ""}`,
              hint: field.type,
          }))
        : [
              ...wrapRole(entity.role).map((line) => ({
                  text: line,
                  muted: true,
              })),
              {
                  text: "campos: o /kickoff propõe",
                  hint: "",
                  muted: true,
                  italic: true,
              },
          ];

const diagramColumns = () => {
    const width = byId("preview").clientWidth;
    return width > 0 && width < NARROW_PREVIEW_PX ? 1 : COLUMNS;
};

const layoutEntities = (entities, columns) => {
    const heights = entities.map(
        (entity) =>
            HEADER_HEIGHT + boxLines(entity).length * ROW_HEIGHT + BOX_PADDING
    );
    const rowHeights = [];
    for (const [index, height] of heights.entries()) {
        const row = Math.floor(index / columns);
        rowHeights[row] = Math.max(rowHeights[row] ?? 0, height);
    }
    return entities.map((entity, index) => {
        const row = Math.floor(index / columns);
        const y = rowHeights
            .slice(0, row)
            .reduce((sum, height) => sum + height + BOX_GAP_Y, 0);
        return {
            entity,
            x: (index % columns) * (BOX_WIDTH + BOX_GAP_X),
            y,
            height: heights[index],
        };
    });
};

const DETOUR_PX = 36;

const center = (box) => [box.x + BOX_WIDTH / 2, box.y + box.height / 2];

const boxesBetween = (boxes, source, target) =>
    boxes.some(
        (box) =>
            box !== source &&
            box !== target &&
            box.x === source.x &&
            box.y > Math.min(source.y, target.y) &&
            box.y < Math.max(source.y, target.y)
    );

// A straight line between two boxes of the same column would run behind the boxes in
// between, so those links leave by the right edge and curve around them.
const connector = (boxes, source, target, { className, label }) => {
    const [startX, startY] = center(source);
    const [endX, endY] = center(target);
    if (source.x === target.x && boxesBetween(boxes, source, target)) {
        const edge = source.x + BOX_WIDTH;
        const bend = edge + DETOUR_PX;
        return `<path class="${className}" fill="none" d="M ${edge} ${startY} C ${bend} ${startY}, ${bend} ${endY}, ${edge} ${endY}" />
            <text class="relation-label" x="${bend + LABEL_OFFSET}" y="${(startY + endY) / 2}">${escapeHtml(label)}</text>`;
    }
    return `<line class="${className}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" />
        <text class="relation-label" x="${(startX + endX) / 2}" y="${(startY + endY) / 2 - LABEL_OFFSET}" text-anchor="middle">${escapeHtml(label)}</text>`;
};

const relationLines = (boxes) =>
    boxes.flatMap((source) =>
        source.entity.relations
            .map((relation) => {
                const target = boxes.find(
                    (box) => box.entity.id === relation.target
                );
                return target
                    ? connector(boxes, source, target, {
                          className: "relation",
                          label: relation.kind,
                      })
                    : "";
            })
            .filter(Boolean)
    );

const impliedLines = (boxes) =>
    inferMentions(boxes.map((box) => box.entity)).map(({ from, to }) =>
        connector(
            boxes,
            boxes.find((box) => box.entity.id === from),
            boxes.find((box) => box.entity.id === to),
            { className: "relation implied", label: "?" }
        )
    );

const entityBox = ({ entity, x, y, height }) => {
    const fields = boxLines(entity)
        .map(
            (line, index) =>
                `<text x="${x + BOX_PADDING}" y="${y + HEADER_HEIGHT + FIELD_BASELINE + index * ROW_HEIGHT}"${line.muted ? ' class="muted"' : ""}${line.italic ? ' font-style="italic"' : ""}>${escapeHtml(line.text)}${line.hint ? ` <tspan opacity=".55">${escapeHtml(line.hint)}</tspan>` : ""}</text>`
        )
        .join("");
    return `<rect class="entity-box" x="${x}" y="${y}" width="${BOX_WIDTH}" height="${height}" rx="8" />
        <rect class="entity-title" x="${x}" y="${y}" width="${BOX_WIDTH}" height="${HEADER_HEIGHT}" rx="8" />
        <text class="entity-title-text" x="${x + BOX_PADDING}" y="${y + TEXT_BASELINE}">${escapeHtml(entity.name || "Nova entidade")}</text>${fields}`;
};

const previewDomain = () => {
    const { entities } = state.kickoff;
    if (entities.length === 0) {
        return '<div class="empty">Adicione uma entidade para ver o diagrama.</div>';
    }
    const columns = diagramColumns();
    const boxes = layoutEntities(entities, columns);
    const width =
        Math.min(entities.length, columns) * (BOX_WIDTH + BOX_GAP_X) -
        BOX_GAP_X +
        (columns === 1 ? DETOUR_PX + BOX_PADDING : 0);
    const height = Math.max(...boxes.map((box) => box.y + box.height));
    return `<div class="preview-card"><svg class="diagram" viewBox="${-VIEWBOX_MARGIN} ${-VIEWBOX_MARGIN} ${width + 2 * VIEWBOX_MARGIN} ${height + 2 * VIEWBOX_MARGIN}" role="img" aria-label="Diagrama de entidades">
        ${impliedLines(boxes).join("")}${relationLines(boxes).join("")}${boxes.map(entityBox).join("")}
    </svg></div>`;
};

const screenFrame = (screen, index) => {
    if (!screen.design) {
        return `<div class="wireframe" data-panel="${escapeHtml(screen.panel)}"><div class="side"></div><div class="content">
            <div class="bar" style="width:40%"></div><div class="bar" style="width:70%"></div><div class="bar"></div><div class="bar" style="width:55%"></div>
        </div></div>`;
    }
    const source = `/screens/${encodeURIComponent(screen.design)}?v=${state.cacheBuster}`;
    return screen.design.endsWith(".html")
        ? `<iframe src="${source}" title="${escapeHtml(screen.name)}" sandbox="allow-scripts" loading="lazy"></iframe>`
        : `<img src="${source}" alt="Design da tela ${escapeHtml(screen.name)}" loading="lazy" data-index="${index}" />`;
};

const previewScreens = () => {
    const { screens } = state.kickoff;
    if (screens.length === 0) {
        return '<div class="empty">Adicione telas para montar a galeria.</div>';
    }
    return `<div class="screen-grid">${screens
        .map(
            (screen, index) => `<div class="screen-card">
                <div class="screen-frame" data-screen-drop="${index}">${screenFrame(screen, index)}</div>
                <div class="screen-meta">
                    <strong>${escapeHtml(screen.name) || "Nova tela"}</strong>
                    <small><code>${escapeHtml(screen.route) || "/rota"}</code> · ${escapeHtml(PANELS[screen.panel] ?? screen.panel)}</small>
                    <div class="row">${actionButton("upload-screen", screen.design ? "Trocar design" : "Anexar design", `data-index="${index}"`)}
                    ${screen.design ? `<a class="button small ghost" href="/screens/${encodeURIComponent(screen.design)}" target="_blank" rel="noopener">Abrir</a>` : ""}</div>
                </div>
            </div>`
        )
        .join("")}</div>`;
};

const brandSurface = (
    dark
) => `<div class="brand-surface" style="${brandVars(dark)}">
    <small>${dark ? "Escuro" : "Claro"}</small>
    <strong style="font-size:1.1rem">${escapeHtml(state.kickoff.product.name) || "Seu produto"}</strong>
    <span class="b-badge">Novo</span>
    <input class="b-input" placeholder="Buscar" aria-label="Exemplo de campo" />
    <div class="b-card">Cartão de exemplo com texto corrido para ver a fonte.</div>
    <div class="row"><button type="button" class="b-button">Salvar</button><button type="button" class="b-outline">Voltar</button></div>
</div>`;

const previewBrand = () => {
    const { brand } = state.kickoff;
    return `<div class="swatches">
        <div class="swatch" style="background:${brand.primaryColor};color:${readableOn(brand.primaryColor)}">primary<br />${escapeHtml(brand.primaryColor)}</div>
        <div class="swatch" style="background:${brand.accentColor};color:${readableOn(brand.accentColor)}">accent<br />${escapeHtml(brand.accentColor)}</div>
    </div>
    <div class="brand-preview">${brandSurface(false)}${brandSurface(true)}</div>
    <div class="callout" style="margin-top:.75rem"><strong>${escapeHtml(brand.style)}</strong><p>${escapeHtml(STYLE_PRESETS[brand.style] ?? "")}</p></div>`;
};

const previewReview = () => {
    const documents = buildDocuments(state.kickoff);
    const tabs = Object.keys(documents)
        .map(
            (name) =>
                `<button type="button" class="button small${name === state.docTab ? " primary" : ""}" data-action="doc-tab" data-doc="${name}">${name}</button>`
        )
        .join("");
    return `<div class="row" style="margin-bottom:.75rem">
            ${actionButton("copy-prompt", "Copiar prompt de design", "", "primary")}
            <a class="button small" href="${CLAUDE_DESIGN_URL}" target="_blank" rel="noopener">Abrir Claude Design ↗</a>
        </div>
        <div class="doc-tabs">${tabs}</div>
        <pre class="doc-view">${escapeHtml(documents[state.docTab])}</pre>`;
};

const PREVIEWS = {
    product: previewProduct,
    features: previewFeatures,
    domain: previewDomain,
    screens: previewScreens,
    brand: previewBrand,
    review: previewReview,
};

// ---------- Rendering ----------

const stepDone = {
    product: () =>
        Boolean(state.kickoff.product.name && state.kickoff.product.problem),
    features: () => true,
    domain: () => state.kickoff.entities.length > 0,
    screens: () => state.kickoff.screens.length > 0,
    brand: () => Boolean(state.kickoff.brand.tone),
    review: () => !state.dirty,
};

const renderSteps = () => {
    byId("steps").innerHTML = STEPS.map(
        (step, index) =>
            `<button type="button" class="step" data-step="${step.id}"${step.id === state.step ? ' aria-current="step"' : ""} data-done="${stepDone[step.id]()}">
                <span class="step-index">${index + 1}</span>${step.label}</button>`
    ).join("");
};

const renderHeader = () => {
    const { product, brand } = state.kickoff;
    byId("product-title").textContent = product.name || "Kickoff do produto";
    const mark = byId("brand-mark");
    mark.textContent = (product.name || "K").trim().charAt(0).toUpperCase();
    mark.style.background = brand.primaryColor;
    mark.style.color = readableOn(brand.primaryColor);
};

const renderPreview = () => {
    byId("preview").innerHTML = PREVIEWS[state.step]();
    byId("preview-hint").textContent = STEPS.find(
        (step) => step.id === state.step
    ).hint;
    renderHeader();
    renderSteps();
};

const draftNotice = () =>
    state.savedKickoff
        ? `<div class="callout"><strong>Rascunho restaurado</strong>
            <p>Este navegador tinha alterações que não foram salvas, e elas foram carregadas.</p>
            <div class="row" style="margin-top:.5rem">${actionButton("discard-draft", "Descartar e usar o que está salvo", "", "danger")}</div>
        </div>`
        : "";

const renderForm = () => {
    byId("form").innerHTML = draftNotice() + FORMS[state.step]();
    renderPreview();
};

const setStatus = (text, kind = "") => {
    const status = byId("save-status");
    status.textContent = text;
    status.dataset.state = kind;
};

const markDirty = () => {
    state.dirty = true;
    setStatus("Alterações não salvas", "dirty");
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.kickoff));
};

// ---------- Persistence ----------

const save = async () => {
    setStatus("Salvando…");
    const response = await fetch("/api/kickoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state.kickoff),
    });
    if (!response.ok) {
        setStatus("Falha ao salvar. Veja o terminal do kickoff.", "dirty");
        return;
    }
    const { written } = await response.json();
    state.dirty = false;
    state.savedKickoff = null;
    localStorage.removeItem(DRAFT_KEY);
    const time = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
    setStatus(`Salvo às ${time}: ${written.length} arquivos`, "saved");
    renderSteps();
};

const load = async () => {
    const response = await fetch("/api/kickoff");
    const saved = normalizeKickoff(await response.json());
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && draft !== JSON.stringify(saved)) {
        state.savedKickoff = saved;
        state.kickoff = normalizeKickoff(JSON.parse(draft));
        markDirty();
    } else {
        localStorage.removeItem(DRAFT_KEY);
        state.kickoff = saved;
    }
    renderForm();
};

const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve(String(reader.result).replace(DATA_URL_PREFIX, ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const uploadScreen = async (index, file) => {
    const screen = state.kickoff.screens[index];
    const extension = file.name.split(".").pop().toLowerCase();
    const screenKey = slugify(screen.name) || screen.id;
    setStatus("Enviando design…");
    const response = await fetch(
        `/api/screens/${encodeURIComponent(screenKey)}`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ extension, data: await readAsBase64(file) }),
        }
    );
    if (!response.ok) {
        setStatus("Arquivo recusado: use PNG, JPG, WebP ou HTML.", "dirty");
        return;
    }
    screen.design = (await response.json()).file;
    state.cacheBuster = Date.now();
    renderPreview();
    await save();
};

// ---------- Actions ----------

const suggestScreens = () => {
    const routes = new Set(state.kickoff.screens.map((screen) => screen.route));
    for (const entity of state.kickoff.entities) {
        const slug = slugify(entity.name);
        if (!slug) {
            continue;
        }
        const candidates = [
            {
                name: `Lista de ${entity.name}`,
                route: `/${slug}`,
                purpose: `Buscar e gerenciar ${entity.name}`,
                states: ["vazio", "carregando", "erro"],
            },
            {
                name: `Formulário de ${entity.name}`,
                route: `/${slug}/create`,
                purpose: `Criar e editar ${entity.name}`,
                states: ["erro", "sucesso"],
            },
        ];
        for (const candidate of candidates) {
            if (!routes.has(candidate.route)) {
                state.kickoff.screens.push({
                    id: newId("s"),
                    panel: "app",
                    entityId: entity.id,
                    notes: "",
                    ...candidate,
                });
            }
        }
    }
};

const indexOf = (button, key = "index") => Number(button.dataset[key]);

const ACTIONS = {
    "add-role": () => state.kickoff.roles.push({ name: "", description: "" }),
    "remove-role": (button) => state.kickoff.roles.splice(indexOf(button), 1),
    "add-entity": () =>
        state.kickoff.entities.push({
            id: newId("e"),
            name: "",
            role: "",
            access: "owner",
            fields: [],
            relations: [],
        }),
    "remove-entity": (button) =>
        state.kickoff.entities.splice(indexOf(button), 1),
    "add-field": (button) =>
        state.kickoff.entities[indexOf(button, "entity")].fields.push({
            name: "",
            type: "texto",
            required: false,
            notes: "",
        }),
    "remove-field": (button) =>
        state.kickoff.entities[indexOf(button, "entity")].fields.splice(
            indexOf(button),
            1
        ),
    "add-relation": (button) =>
        state.kickoff.entities[indexOf(button, "entity")].relations.push({
            kind: "1-n",
            target: "",
        }),
    "remove-relation": (button) =>
        state.kickoff.entities[indexOf(button, "entity")].relations.splice(
            indexOf(button),
            1
        ),
    "add-flow": () => state.kickoff.flows.push({ name: "", steps: "" }),
    "remove-flow": (button) => state.kickoff.flows.splice(indexOf(button), 1),
    "add-screen": () =>
        state.kickoff.screens.push({
            id: newId("s"),
            name: "",
            route: "",
            panel: "app",
            entityId: "",
            purpose: "",
            notes: "",
            states: [],
        }),
    "remove-screen": (button) =>
        state.kickoff.screens.splice(indexOf(button), 1),
    "suggest-screens": suggestScreens,
};

const VIEW_ACTIONS = {
    "discard-draft": () => {
        state.kickoff = state.savedKickoff;
        state.savedKickoff = null;
        state.dirty = false;
        localStorage.removeItem(DRAFT_KEY);
        setStatus("");
        renderForm();
    },
    "upload-screen": (button) => {
        state.uploadTarget = indexOf(button);
        byId("screen-upload").click();
    },
    "doc-tab": (button) => {
        state.docTab = button.dataset.doc;
        renderPreview();
    },
    "copy-prompt": async () => {
        await navigator.clipboard.writeText(
            buildDocuments(state.kickoff)["DESIGN-PROMPT.md"]
        );
        setStatus("Prompt copiado", "saved");
    },
};

const setMobileView = (view) => {
    const layout = document.querySelector(".layout");
    layout.dataset.mobileView = view;
    for (const button of document.querySelectorAll(
        "button[data-mobile-view]"
    )) {
        button.setAttribute(
            "aria-selected",
            String(button.dataset.mobileView === view)
        );
    }
    renderPreview();
};

const handleClick = (event) => {
    const viewButton = event.target.closest("button[data-mobile-view]");
    if (viewButton) {
        setMobileView(viewButton.dataset.mobileView);
        return;
    }
    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
        state.step = stepButton.dataset.step;
        renderForm();
        return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) {
        return;
    }
    const { action } = button.dataset;
    if (VIEW_ACTIONS[action]) {
        VIEW_ACTIONS[action](button);
        return;
    }
    ACTIONS[action]?.(button);
    markDirty();
    renderForm();
};

const handleInput = (event) => {
    const { target } = event;
    if (target.dataset.screenState !== undefined) {
        const screen =
            state.kickoff.screens[Number(target.dataset.screenState)];
        screen.states = target.checked
            ? [...screen.states, target.value]
            : screen.states.filter((name) => name !== target.value);
    } else if (target.dataset.path) {
        setAt(
            target.dataset.path,
            target.type === "checkbox" ? target.checked : target.value
        );
    } else {
        return;
    }
    markDirty();
    renderPreview();
};

// Renaming an entity or a screen changes the selects that list them. The form is
// rebuilt after the focus has moved, and the focus is put back on the same field.
const rerenderKeepingFocus = () => {
    setTimeout(() => {
        const path = document.activeElement?.dataset?.path;
        renderForm();
        if (path) {
            document
                .querySelector(`[data-path="${CSS.escape(path)}"]`)
                ?.focus();
        }
    }, 0);
};

const handleChange = (event) => {
    if (
        event.target.dataset.path?.endsWith(".name") ||
        event.target.hasAttribute("data-rerender")
    ) {
        rerenderKeepingFocus();
    }
};

const dropTarget = (event) => event.target.closest("[data-screen-drop]");

const bindDragAndDrop = () => {
    const preview = byId("preview");
    preview.addEventListener("dragover", (event) => {
        const frame = dropTarget(event);
        if (frame) {
            event.preventDefault();
            frame.dataset.drop = "true";
        }
    });
    preview.addEventListener("dragleave", (event) => {
        const frame = dropTarget(event);
        if (frame) {
            frame.dataset.drop = "false";
        }
    });
    preview.addEventListener("drop", (event) => {
        const frame = dropTarget(event);
        const file = event.dataTransfer?.files?.[0];
        if (frame && file) {
            event.preventDefault();
            uploadScreen(Number(frame.dataset.screenDrop), file);
        }
    });
};

const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
};

const init = () => {
    applyTheme(
        localStorage.getItem(THEME_KEY) ??
            (window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light")
    );
    document.addEventListener("click", handleClick);
    byId("form").addEventListener("input", handleInput);
    byId("form").addEventListener("change", handleChange);
    byId("form").addEventListener(
        "toggle",
        (event) => {
            const id = event.target.dataset?.entityDetails;
            if (!id) {
                return;
            }
            if (event.target.open) {
                state.openDetails.add(id);
            } else {
                state.openDetails.delete(id);
            }
        },
        true
    );
    byId("save-button").addEventListener("click", save);
    byId("theme-toggle").addEventListener("click", () =>
        applyTheme(
            document.documentElement.dataset.theme === "dark" ? "light" : "dark"
        )
    );
    byId("screen-upload").addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (file && state.uploadTarget !== null) {
            uploadScreen(state.uploadTarget, file);
        }
        event.target.value = "";
    });
    document.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
            event.preventDefault();
            save();
        }
    });
    window.addEventListener("beforeunload", (event) => {
        if (state.dirty) {
            event.preventDefault();
        }
    });
    bindDragAndDrop();
    window.addEventListener("resize", renderPreview);
    load();
};

init();
