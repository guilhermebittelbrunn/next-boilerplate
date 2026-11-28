import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricStrip } from "@/shared/components/ui/MetricStrip";

const ITEMS = [
    {
        key: "total",
        label: "Total",
        value: 1_234_567,
        hint: "Todos os registros",
    },
    { key: "active", label: "Ativos", value: 42 },
];

function valueCells(container: HTMLElement) {
    return Array.from(container.querySelectorAll("dl > div")).map(
        (item) => item.querySelectorAll("dd")[0]?.textContent
    );
}

describe("MetricStrip", () => {
    it.each([
        ["pt-br", "1.234.567"],
        ["en", "1,234,567"],
        ["es", "1.234.567"],
    ])(
        "formata o número com o separador de milhar do locale %s",
        (locale, expected) => {
            const { container } = render(
                <MetricStrip items={ITEMS} locale={locale} />
            );

            expect(valueCells(container)).toEqual([expected, "42"]);
        }
    );

    it("associa cada rótulo ao seu valor numa lista de descrição", () => {
        const { container } = render(
            <MetricStrip items={ITEMS} locale="pt-br" />
        );

        const terms = Array.from(container.querySelectorAll("dt")).map(
            (term) => term.textContent
        );
        expect(terms).toEqual(["Total", "Ativos"]);
        expect(container.textContent).toContain("Todos os registros");
    });

    it("troca os números por esqueleto e marca a lista como ocupada durante o carregamento", () => {
        const { container } = render(
            <MetricStrip items={ITEMS} loading locale="pt-br" />
        );

        expect(container.querySelector("dl")?.getAttribute("aria-busy")).toBe(
            "true"
        );
        expect(
            container.querySelectorAll('[data-slot="skeleton"]')
        ).toHaveLength(2);
        expect(container.textContent).not.toContain("1.234.567");
    });
});

const THREE_ITEMS = 3;
const FOUR_ITEMS = 4;
const FIVE_ITEMS = 5;
const TWO_FULL_ROWS_AT_LG = 8;
const WRAPPING_COUNTS = [FOUR_ITEMS, FIVE_ITEMS, TWO_FULL_ROWS_AT_LG];

function buildItems(count: number) {
    return Array.from({ length: count }, (_, index) => ({
        key: `metric-${index + 1}`,
        label: `Métrica ${index + 1}`,
        value: index,
    }));
}

function listClasses(count: number) {
    const { container } = render(
        <MetricStrip items={buildItems(count)} locale="pt-br" />
    );
    return container.querySelector("dl")?.className.split(" ") ?? [];
}

describe("layout do MetricStrip", () => {
    it.each(WRAPPING_COUNTS)(
        "com %i itens usa a grade de 2 colunas que vira 4 em lg, com divisória por posição",
        (count) => {
            const classes = listClasses(count);

            expect(classes).toEqual(
                expect.arrayContaining([
                    "grid-cols-2",
                    "lg:grid-cols-4",
                    "[&>:nth-child(2n)]:border-l",
                    "max-lg:[&>:nth-child(n+3)]:border-t",
                    "lg:[&>:nth-child(4n+3)]:border-l",
                    "lg:[&>:nth-child(n+5)]:border-t",
                ])
            );
            expect(classes).not.toContain("sm:grid-cols-3");
            expect(classes.some((name) => name.includes("divide-x"))).toBe(
                false
            );
        }
    );

    it("com 3 itens mantém a coluna única que vira 3 em sm", () => {
        const classes = listClasses(THREE_ITEMS);

        expect(classes).toEqual(
            expect.arrayContaining([
                "grid-cols-1",
                "sm:grid-cols-3",
                "divide-y",
            ])
        );
        expect(classes).not.toContain("lg:grid-cols-4");
    });

    it("com 2 itens mantém as 2 colunas com divisória vertical", () => {
        const classes = listClasses(2);

        expect(classes).toEqual(
            expect.arrayContaining(["grid-cols-2", "divide-x"])
        );
        expect(classes).not.toContain("lg:grid-cols-4");
    });
});

const ONE_ITEM = 1;
const TWO_ITEMS = 2;
const NINE_DIGITS = 123_456_789;

function valueClasses(count: number) {
    const items = buildItems(count).map((item) => ({
        ...item,
        value: NINE_DIGITS,
    }));
    const { container } = render(<MetricStrip items={items} locale="pt-br" />);
    return Array.from(container.querySelectorAll("dl > div")).map((cell) => ({
        cell: cell.className.split(" "),
        value: cell.querySelector("dd")?.className.split(" ") ?? [],
    }));
}

describe("valor do MetricStrip", () => {
    it.each(WRAPPING_COUNTS)(
        "com %i itens mantém o número numa linha só, numa escala menor",
        (count) => {
            for (const { cell, value } of valueClasses(count)) {
                expect(value).toEqual(
                    expect.arrayContaining([
                        "whitespace-nowrap",
                        "text-xl",
                        "xl:text-2xl",
                        "tabular-nums",
                    ])
                );
                expect(value).not.toContain("[overflow-wrap:anywhere]");
                expect(value).not.toContain("text-2xl");
                expect(value).not.toContain("sm:text-3xl");
                expect(cell).toContain("px-4");
            }
        }
    );

    it.each([ONE_ITEM, TWO_ITEMS, THREE_ITEMS])(
        "com %i itens mantém a escala e o espaçamento das homes",
        (count) => {
            for (const { cell, value } of valueClasses(count)) {
                expect(value).toEqual(
                    expect.arrayContaining([
                        "text-2xl",
                        "sm:text-3xl",
                        "[overflow-wrap:anywhere]",
                    ])
                );
                expect(value).not.toContain("whitespace-nowrap");
                expect(cell).toContain("px-5");
            }
        }
    );
});
