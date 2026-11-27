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
