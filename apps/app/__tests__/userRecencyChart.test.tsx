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

const { UserRecencyChart } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/UserRecencyChart"
);

const BY_RECENCY = {
    last7Days: 12,
    from8To30Days: 7,
    from31To90Days: 23,
    over90Days: 18,
    never: 940,
};

function chartStyleText(container: HTMLElement) {
    return container.querySelector("style")?.textContent ?? "";
}

beforeEach(() => {
    // Vitest runs without globals here, so RTL never auto-unmounts between cases.
    cleanup();
    barChartProps.current = null;
    xAxisProps.current = null;
});

describe("UserRecencyChart", () => {
    it("plots one column per bucket, most recent first", () => {
        render(<UserRecencyChart byRecency={BY_RECENCY} />);

        const data = barChartProps.current?.data as {
            category: string;
            value: number;
        }[];
        expect(data.map((datum) => datum.category)).toEqual([
            "last7Days",
            "from8To30Days",
            "from31To90Days",
            "over90Days",
            "never",
        ]);
        expect(data.map((datum) => datum.value)).toEqual([
            BY_RECENCY.last7Days,
            BY_RECENCY.from8To30Days,
            BY_RECENCY.from31To90Days,
            BY_RECENCY.over90Days,
            BY_RECENCY.never,
        ]);
    });

    it("paints each column from the theme variable instead of the library default", () => {
        render(<UserRecencyChart byRecency={BY_RECENCY} />);

        const data = barChartProps.current?.data as { fill: string }[];
        expect(data.map((datum) => datum.fill)).toEqual([
            "var(--color-last7Days)",
            "var(--color-from8To30Days)",
            "var(--color-from31To90Days)",
            "var(--color-over90Days)",
            "var(--color-never)",
        ]);
    });

    it("binds the five buckets to five distinct chart tokens, light and dark", () => {
        const { container } = render(
            <UserRecencyChart byRecency={BY_RECENCY} />
        );

        const style = chartStyleText(container);
        expect(style).toContain("--color-last7Days: var(--chart-1)");
        expect(style).toContain("--color-from8To30Days: var(--chart-2)");
        expect(style).toContain("--color-from31To90Days: var(--chart-3)");
        expect(style).toContain("--color-over90Days: var(--chart-4)");
        expect(style).toContain("--color-never: var(--chart-5)");
        expect(style).toContain(".dark");
    });

    it("labels the axis with the short translated ranges", () => {
        render(<UserRecencyChart byRecency={BY_RECENCY} />);

        const tickFormatter = xAxisProps.current?.tickFormatter as (
            value: string
        ) => string;
        expect(tickFormatter("last7Days")).toBe("0-7d");
        expect(tickFormatter("from8To30Days")).toBe("8-30d");
        expect(tickFormatter("from31To90Days")).toBe("31-90d");
        expect(tickFormatter("over90Days")).toBe("+90d");
        expect(tickFormatter("never")).toBe("Nunca");
    });

    it("draws a tick for every bucket instead of hiding the ones that collide", () => {
        render(<UserRecencyChart byRecency={BY_RECENCY} />);

        expect(xAxisProps.current?.interval).toBe(0);
    });

    it("describes the chart for a reader that cannot see the columns", () => {
        const { container } = render(
            <UserRecencyChart byRecency={BY_RECENCY} />
        );

        const chart = container.querySelector('[data-slot="chart"]');
        expect(chart?.getAttribute("role")).toBe("img");
        expect(chart?.getAttribute("aria-label")).toBe(
            "Último acesso por faixa"
        );
    });
});
