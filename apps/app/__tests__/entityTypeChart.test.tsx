import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { barChartProps, xAxisProps } = vi.hoisted(() => ({
    barChartProps: { current: null as Record<string, unknown> | null },
    xAxisProps: { current: null as Record<string, unknown> | null },
}));

/**
 * recharts measures the DOM before drawing, and jsdom reports every box as zero, so the
 * real library renders nothing here. The stubs keep the props the chart passes down
 * observable, which is where the colour and the label wiring lives.
 */
vi.mock("recharts", () => {
    const passthrough = ({ children }: { children?: ReactNode }) => (
        <div>{children}</div>
    );

    return {
        ResponsiveContainer: passthrough,
        BarChart: (props: Record<string, unknown>) => {
            barChartProps.current = props;
            return <div>{props.children as ReactNode}</div>;
        },
        Bar: passthrough,
        CartesianGrid: () => null,
        LabelList: () => null,
        XAxis: (props: Record<string, unknown>) => {
            xAxisProps.current = props;
            return null;
        },
        Tooltip: () => null,
        Legend: () => null,
    };
});

const { EntityTypeChart } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/(components)/EntityTypeChart"
);

const BY_TYPE = { franchise: 2, customer: 1, collaborator: 1 };

function chartStyleText(container: HTMLElement) {
    return container.querySelector("style")?.textContent ?? "";
}

beforeEach(() => {
    // Vitest runs without globals here, so RTL never auto-unmounts between cases.
    cleanup();
    barChartProps.current = null;
    xAxisProps.current = null;
});

describe("EntityTypeChart", () => {
    it("plots one column per type, in the order the labels are declared", () => {
        render(<EntityTypeChart byType={BY_TYPE} />);

        const data = barChartProps.current?.data as {
            category: string;
            value: number;
        }[];
        expect(data.map((datum) => datum.category)).toEqual([
            "franchise",
            "customer",
            "collaborator",
        ]);
        expect(data.map((datum) => datum.value)).toEqual([2, 1, 1]);
    });

    it("paints each column from the theme variable instead of the library default", () => {
        render(<EntityTypeChart byType={BY_TYPE} />);

        const data = barChartProps.current?.data as { fill: string }[];
        expect(data.map((datum) => datum.fill)).toEqual([
            "var(--color-franchise)",
            "var(--color-customer)",
            "var(--color-collaborator)",
        ]);
    });

    it("binds those variables to the chart tokens, light and dark", () => {
        const { container } = render(<EntityTypeChart byType={BY_TYPE} />);

        const style = chartStyleText(container);
        expect(style).toContain("--color-franchise: var(--chart-1)");
        expect(style).toContain("--color-customer: var(--chart-2)");
        expect(style).toContain("--color-collaborator: var(--chart-3)");
        expect(style).toContain(".dark");
    });

    it("labels the axis with the translated type names", () => {
        render(<EntityTypeChart byType={BY_TYPE} />);

        const tickFormatter = xAxisProps.current?.tickFormatter as (
            value: string
        ) => string;
        expect(tickFormatter("franchise")).toBe("Franquia");
        expect(tickFormatter("customer")).toBe("Cliente");
        expect(tickFormatter("collaborator")).toBe("Colaborador");
    });

    it("keeps an unknown category readable rather than blank", () => {
        render(<EntityTypeChart byType={BY_TYPE} />);

        const tickFormatter = xAxisProps.current?.tickFormatter as (
            value: string
        ) => string;
        expect(tickFormatter("supplier")).toBe("supplier");
    });

    it("describes the chart for a reader that cannot see the columns", () => {
        const { container } = render(<EntityTypeChart byType={BY_TYPE} />);

        const chart = container.querySelector('[data-slot="chart"]');
        expect(chart?.getAttribute("role")).toBe("img");
        expect(chart?.getAttribute("aria-label")).toBe("Entidades por tipo");
    });
});
