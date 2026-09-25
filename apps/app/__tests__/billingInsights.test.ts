import type { BillingPlanCountDTO } from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import {
    buildPlanChartEntries,
    describePlanInterval,
    formatUtcDate,
    formatUtcMonth,
    MAX_CHART_PLANS,
    PLAN_AXIS_LABEL_MAX_CHARS,
    truncateAxisLabel,
} from "@/shared/lib/billingInsights";

const FIVE_PLANS = Array.from(
    { length: MAX_CHART_PLANS },
    (_, index) => index + 1
);
const LARGEST_COUNT = 9;
const SIX_PLAN_COUNTS = Array.from(
    { length: MAX_CHART_PLANS + 1 },
    (_, index) => LARGEST_COUNT - index
);
const GROUPED_COUNT = SIX_PLAN_COUNTS.slice(MAX_CHART_PLANS - 1).reduce(
    (sum, count) => sum + count,
    0
);
const TOP_COUNT = 10;
const QUARTERLY = 3;

const COPY = { unnamed: "Plano sem nome", other: "Resto" };

/**
 * A 320 px de viewport os centros dos cinco ticks ficam a cerca de 38 px um do outro, e com a
 * fonte de 12 px do eixo um rótulo de seis caracteres como "Empre…" ocupa 43 px, cerca de
 * 7,2 px por caractere. Um rótulo mais largo que a distância entre ticks invade o vizinho.
 */
const TICK_SPACING_AT_320_PX = 38;
const WIDE_LABEL_PX = 43;
const WIDE_LABEL_CHARS = 6;
const CHAR_WIDTH_PX = WIDE_LABEL_PX / WIDE_LABEL_CHARS;

const INTERVAL_COPY = {
    interval: {
        day: "diário",
        week: "semanal",
        month: "mensal",
        year: "anual",
    },
    everyInterval: "a cada {count} {unit}",
    intervalUnits: {
        day: "dias",
        week: "semanas",
        month: "meses",
        year: "anos",
    },
};

function plan(
    priceId: string,
    count: number,
    name: string | null = priceId
): BillingPlanCountDTO {
    return {
        priceId,
        productId: null,
        name,
        interval: "month",
        intervalCount: 1,
        count,
    };
}

describe("truncateAxisLabel", () => {
    it("mantém o rótulo curto", () => {
        expect(truncateAxisLabel("Pro")).toBe("Pro");
        expect(truncateAxisLabel("Plano")).toBe("Plano");
    });

    it("corta o rótulo longo com reticências sem passar do limite", () => {
        const label = truncateAxisLabel("Profissional anual");

        expect(label).toBe("Prof…");
        expect(Array.from(label)).toHaveLength(PLAN_AXIS_LABEL_MAX_CHARS);
    });

    it("o maior rótulo possível cabe na distância entre ticks a 320 px", () => {
        expect(PLAN_AXIS_LABEL_MAX_CHARS * CHAR_WIDTH_PX).toBeLessThanOrEqual(
            TICK_SPACING_AT_320_PX
        );
    });

    it("não parte um caractere composto ao meio", () => {
        expect(Array.from(truncateAxisLabel("🚀🚀🚀🚀🚀🚀🚀"))).toHaveLength(
            PLAN_AXIS_LABEL_MAX_CHARS
        );
    });
});

describe("buildPlanChartEntries", () => {
    it("com até 5 planos, uma barra por plano, com chaves posicionais e cores do tema", () => {
        const entries = buildPlanChartEntries(
            FIVE_PLANS.map((index) =>
                plan(`price_${index}`, TOP_COUNT - index)
            ),
            COPY
        );

        expect(entries.map((entry) => entry.key)).toEqual([
            "plan0",
            "plan1",
            "plan2",
            "plan3",
            "plan4",
        ]);
        expect(entries.map((entry) => entry.color)).toEqual([
            "var(--chart-1)",
            "var(--chart-2)",
            "var(--chart-3)",
            "var(--chart-4)",
            "var(--chart-5)",
        ]);
    });

    it("com mais de 5 planos, mostra os 4 primeiros e soma o resto numa barra só", () => {
        const entries = buildPlanChartEntries(
            SIX_PLAN_COUNTS.map((count) => plan(`price_${count}`, count)),
            COPY
        );

        expect(entries).toHaveLength(MAX_CHART_PLANS);
        expect(entries.at(-1)).toMatchObject({
            key: "other",
            name: "Resto",
            axisLabel: "Resto",
            count: GROUPED_COUNT,
            plan: null,
        });
    });

    it("nunca usa o priceId como chave, que vira nome de variável CSS", () => {
        const entries = buildPlanChartEntries([plan("price_1Qx.$", 1)], COPY);

        expect(entries[0]?.key).toBe("plan0");
    });

    it("plano sem nome usa o rótulo traduzido, cortado no eixo", () => {
        const [entry] = buildPlanChartEntries([plan("price_x", 1, null)], COPY);

        expect(entry?.name).toBe("Plano sem nome");
        expect(entry?.axisLabel).toBe("Plan…");
    });
});

describe("describePlanInterval", () => {
    it("intervalo simples usa o adjetivo", () => {
        expect(describePlanInterval(INTERVAL_COPY, "month", 1)).toBe("mensal");
        expect(describePlanInterval(INTERVAL_COPY, "year", null)).toBe("anual");
    });

    it("intervalo múltiplo diz a cada quantos", () => {
        expect(describePlanInterval(INTERVAL_COPY, "month", QUARTERLY)).toBe(
            "a cada 3 meses"
        );
    });

    it("sem intervalo não descreve nada", () => {
        expect(describePlanInterval(INTERVAL_COPY, null, null)).toBeNull();
    });
});

describe("formatUtcMonth e formatUtcDate", () => {
    const LAST_MS_OF_SEPTEMBER = "2026-09-30T23:59:59.999Z";
    const FIRST_OF_OCTOBER = "2026-10-01T00:00:00.000Z";

    it.each([
        ["pt-br", "setembro de 2026"],
        ["en", "September 2026"],
        ["es", "septiembre de 2026"],
    ])("escreve o mês em UTC em %s", (locale, expected) => {
        expect(formatUtcMonth("2026-09-01T00:00:00.000Z", locale)).toBe(
            expected
        );
    });

    it("o último milissegundo do mês continua no mês, qualquer que seja o fuso do processo", () => {
        expect(formatUtcDate(LAST_MS_OF_SEPTEMBER, "en")).toBe("Sep 30, 2026");
        expect(formatUtcDate(FIRST_OF_OCTOBER, "en")).toBe("Oct 1, 2026");
    });

    it.each([
        ["pt-br", "30 de set. de 2026"],
        ["es", "30 sept 2026"],
    ])("escreve a data por idioma em %s", (locale, expected) => {
        expect(formatUtcDate(LAST_MS_OF_SEPTEMBER, locale)).toBe(expected);
    });

    it("data inválida não vira texto", () => {
        expect(formatUtcDate("not-a-date", "en")).toBeNull();
    });
});
