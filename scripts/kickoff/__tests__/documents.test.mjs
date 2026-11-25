import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    buildDesignPrompt,
    buildDocuments,
    buildDomainDoc,
    buildScreensDoc,
    createEmptyKickoff,
    inferMentions,
    normalizeKickoff,
    slugify,
} from "../documents.mjs";

const SALON_TO_BOOKING = /salao \|\|--o\{ agendamento : "1-n"/;
const GONE_ENTITY = /e-gone/;
const ESCAPED_PIPE = /a\\\|b/;
const SCREEN_IMAGE =
    /!\[Lista de agendamentos\]\(screens\/lista-de-agendamentos\.png\)/;
const SCREEN_TITLE = /\*\*Lista de agendamentos\*\*/;
const SCREEN_FIELDS = /Dados: data e hora, valor\./;
const SIDEBAR_TOKEN = /--sidebar-ring/;
const IMPLIED_RELATION = /agendamento \}o\.\.o\{ profissional : "a confirmar"/;
const PROPOSED_BY_KICKOFF = /a propor pelo `\/kickoff`/;
const ROLE_LINE = /\*\*Papel no sistema:\*\* Horário que o cliente marca/;

const sampleKickoff = () => {
    const kickoff = createEmptyKickoff();
    kickoff.product.name = "Agendaí";
    kickoff.product.tagline = "Agenda online para salões";
    kickoff.entities = [
        {
            id: "e-salon",
            name: "Salão",
            description: "Estabelecimento",
            access: "organization",
            fields: [
                { name: "nome", type: "texto", required: true, notes: "" },
            ],
            relations: [{ kind: "1-n", target: "e-booking" }],
        },
        {
            id: "e-booking",
            name: "Agendamento",
            description: "Horário marcado",
            access: "owner",
            fields: [
                {
                    name: "data e hora",
                    type: "data",
                    required: true,
                    notes: "",
                },
                {
                    name: "valor",
                    type: "dinheiro",
                    required: false,
                    notes: "a|b",
                },
            ],
            relations: [],
        },
    ];
    kickoff.screens = [
        {
            id: "s-1",
            name: "Lista de agendamentos",
            route: "/agendamentos",
            panel: "app",
            entityId: "e-booking",
            purpose: "Ver a agenda do dia",
            notes: "",
            states: ["vazio", "erro"],
            design: "lista-de-agendamentos.png",
        },
    ];
    return kickoff;
};

describe("slugify", () => {
    it("removes accents and punctuation", () => {
        assert.equal(slugify("Formulário de Ação!"), "formulario-de-acao");
        assert.equal(slugify("  "), "");
    });
});

describe("buildDocuments", () => {
    it("produces the four documents", () => {
        assert.deepEqual(Object.keys(buildDocuments(sampleKickoff())), [
            "PRODUCT.md",
            "DOMAIN.md",
            "SCREENS.md",
            "DESIGN-PROMPT.md",
        ]);
    });

    it("draws relations only towards existing entities", () => {
        const kickoff = sampleKickoff();
        kickoff.entities[0].relations.push({ kind: "n-n", target: "e-gone" });
        const domain = buildDomainDoc(kickoff);
        assert.match(domain, SALON_TO_BOOKING);
        assert.doesNotMatch(domain, GONE_ENTITY);
    });

    it("escapes pipes inside table cells", () => {
        assert.match(buildDomainDoc(sampleKickoff()), ESCAPED_PIPE);
    });

    it("links the attached design of each screen", () => {
        assert.match(buildScreensDoc(sampleKickoff()), SCREEN_IMAGE);
    });

    it("lists screens with their entity fields in the design prompt", () => {
        const prompt = buildDesignPrompt(sampleKickoff());
        assert.match(prompt, SCREEN_TITLE);
        assert.match(prompt, SCREEN_FIELDS);
        assert.match(prompt, SIDEBAR_TOKEN);
    });
});

describe("normalizeKickoff", () => {
    it("fills missing sections without dropping saved values", () => {
        const kickoff = normalizeKickoff({
            product: { name: "X" },
            entities: [{ id: "e", name: "A" }],
        });
        assert.equal(kickoff.product.name, "X");
        assert.equal(kickoff.product.mode, "subscription");
        assert.deepEqual(kickoff.entities[0].fields, []);
        assert.equal(kickoff.brand.radius, "md");
    });

    it("ignores input that is not an object", () => {
        assert.deepEqual(normalizeKickoff(null), createEmptyKickoff());
    });
});

const roleOnlyEntities = () => [
    {
        id: "e-salon",
        name: "Salão",
        role: "Estabelecimento onde trabalham os profissionais",
        fields: [],
        relations: [],
    },
    {
        id: "e-pro",
        name: "Profissional",
        role: "Quem atende",
        fields: [],
        relations: [],
    },
    {
        id: "e-booking",
        name: "Agendamento",
        role: "Horário que o cliente marca com um profissional",
        fields: [],
        relations: [],
    },
];

describe("inferMentions", () => {
    it("links entities named in another entity's role, plural included", () => {
        assert.deepEqual(inferMentions(roleOnlyEntities()), [
            { from: "e-salon", to: "e-pro" },
            { from: "e-booking", to: "e-pro" },
        ]);
    });

    it("skips pairs that already have an explicit relation", () => {
        const entities = roleOnlyEntities();
        entities[1].relations = [{ kind: "1-n", target: "e-booking" }];
        assert.deepEqual(inferMentions(entities), [
            { from: "e-salon", to: "e-pro" },
        ]);
    });
});

describe("entities described only by name and role", () => {
    it("leaves fields and relations for /kickoff and marks implied links", () => {
        const kickoff = createEmptyKickoff();
        kickoff.entities = roleOnlyEntities();
        const domain = buildDomainDoc(kickoff);
        assert.match(domain, ROLE_LINE);
        assert.match(domain, PROPOSED_BY_KICKOFF);
        assert.match(domain, IMPLIED_RELATION);
    });

    it("migrates the old description field into role", () => {
        const kickoff = normalizeKickoff({
            entities: [{ id: "e", name: "A", description: "Antigo" }],
        });
        assert.equal(kickoff.entities[0].role, "Antigo");
    });
});
