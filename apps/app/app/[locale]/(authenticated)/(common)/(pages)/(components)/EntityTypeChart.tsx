"use client";

import { CategoryBarChart } from "@repo/design-system/components/ui/category-bar-chart";
import type { ChartConfig } from "@repo/design-system/components/ui/chart";
import { getDictionary } from "@repo/internationalization/client";
import type { EntitySummaryDTO } from "@repo/sdk/src/types";

type EntityTypeChartProps = {
    byType: EntitySummaryDTO["byType"];
};

export function EntityTypeChart({ byType }: EntityTypeChartProps) {
    const { dictionary } = getDictionary();
    const typeLabels =
        dictionary.apps.app.pages.common.entities.list.typeLabels;
    const homeChart = dictionary.apps.app.pages.common.home.chart;

    const config = {
        franchise: {
            label: typeLabels.franchise,
            color: "var(--chart-1)",
        },
        customer: {
            label: typeLabels.customer,
            color: "var(--chart-2)",
        },
        collaborator: {
            label: typeLabels.collaborator,
            color: "var(--chart-3)",
        },
    } satisfies ChartConfig;

    const data = [
        { category: "franchise", value: byType.franchise },
        { category: "customer", value: byType.customer },
        { category: "collaborator", value: byType.collaborator },
    ];

    return (
        <CategoryBarChart
            className="aspect-auto h-64 w-full"
            config={config}
            data={data}
            label={homeChart.title}
        />
    );
}
