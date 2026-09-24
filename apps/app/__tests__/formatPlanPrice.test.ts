import { describe, expect, it } from "vitest";
import {
    describePlanPrice,
    formatPeriodEnd,
    formatPlanPrice,
} from "@/shared/lib/formatPlanPrice";

const COPY = {
    pricePerInterval: "{price} / {interval}",
    pricePerIntervals: "{price} a cada {count} {interval}",
    interval: {
        day: { one: "dia", other: "dias" },
        week: { one: "semana", other: "semanas" },
        month: { one: "mês", other: "meses" },
        year: { one: "ano", other: "anos" },
    },
};

const BRL_29 = 2900;
const USD_19_99 = 1999;
const JPY_500 = 500;

/** Intl separates the currency symbol with a no-break space; the assertions read plain text. */
const plain = (value: string | null) => value?.replace(/\s/g, " ") ?? null;

describe("formatPlanPrice", () => {
    it("divide BRL por 100 e formata no locale da tela", () => {
        expect(plain(formatPlanPrice(BRL_29, "brl", "pt-br"))).toBe("R$ 29,00");
    });

    it("formata USD em inglês", () => {
        expect(plain(formatPlanPrice(USD_19_99, "usd", "en"))).toBe("$19.99");
    });

    it("não divide JPY, que não tem casas decimais", () => {
        expect(plain(formatPlanPrice(JPY_500, "jpy", "en"))).toBe("¥500");
    });

    it("devolve null sem valor, para a UI omitir o preço", () => {
        expect(formatPlanPrice(null, "brl", "pt-br")).toBeNull();
    });

    it("devolve null sem moeda", () => {
        expect(formatPlanPrice(BRL_29, null, "pt-br")).toBeNull();
    });

    it("devolve null para um código de moeda que o Intl não aceita", () => {
        expect(formatPlanPrice(BRL_29, "not-a-currency", "pt-br")).toBeNull();
    });
});

describe("describePlanPrice", () => {
    it("usa a forma singular para intervalo de 1", () => {
        expect(
            plain(
                describePlanPrice(
                    COPY,
                    {
                        unitAmount: 2900,
                        currency: "brl",
                        interval: "month",
                        intervalCount: 1,
                    },
                    "pt-br"
                )
            )
        ).toBe("R$ 29,00 / mês");
    });

    it("usa a forma plural com a contagem para intervalos maiores", () => {
        expect(
            plain(
                describePlanPrice(
                    COPY,
                    {
                        unitAmount: 7900,
                        currency: "brl",
                        interval: "month",
                        intervalCount: 3,
                    },
                    "pt-br"
                )
            )
        ).toBe("R$ 79,00 a cada 3 meses");
    });

    it("mostra só o preço quando o intervalo é desconhecido", () => {
        expect(
            plain(
                describePlanPrice(
                    COPY,
                    {
                        unitAmount: 2900,
                        currency: "brl",
                        interval: null,
                        intervalCount: null,
                    },
                    "pt-br"
                )
            )
        ).toBe("R$ 29,00");
    });

    it("devolve null sem preço", () => {
        expect(
            describePlanPrice(
                COPY,
                {
                    unitAmount: null,
                    currency: "brl",
                    interval: "month",
                    intervalCount: 1,
                },
                "pt-br"
            )
        ).toBeNull();
    });
});

describe("formatPeriodEnd", () => {
    it("formata a data por extenso no locale da tela", () => {
        expect(formatPeriodEnd("2026-10-24T12:00:00.000Z", "en")).toBe(
            "October 24, 2026"
        );
    });

    it("devolve null para uma data inválida", () => {
        expect(formatPeriodEnd("not-a-date", "en")).toBeNull();
    });
});
