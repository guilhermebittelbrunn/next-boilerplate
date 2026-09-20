"use client";

import { CategoryBarChart } from "@repo/design-system/components/ui/category-bar-chart";
import type { ChartConfig } from "@repo/design-system/components/ui/chart";
import { getDictionary } from "@repo/internationalization/client";
import type { UserActivitySummaryDTO } from "@repo/sdk/src/types";

type UserRecencyChartProps = {
    byRecency: UserActivitySummaryDTO["byRecency"];
};

export function UserRecencyChart({ byRecency }: UserRecencyChartProps) {
    const { dictionary } = getDictionary();
    const activity = dictionary.apps.app.pages.admin.home.activity;

    const config = {
        last7Days: {
            label: activity.buckets.last7Days,
            color: "var(--chart-1)",
        },
        from8To30Days: {
            label: activity.buckets.from8To30Days,
            color: "var(--chart-2)",
        },
        from31To90Days: {
            label: activity.buckets.from31To90Days,
            color: "var(--chart-3)",
        },
        over90Days: {
            label: activity.buckets.over90Days,
            color: "var(--chart-4)",
        },
        never: {
            label: activity.buckets.never,
            color: "var(--chart-5)",
        },
    } satisfies ChartConfig;

    // Most recent first, so the columns read left to right as time since the last sign-in.
    const data = [
        { category: "last7Days", value: byRecency.last7Days },
        { category: "from8To30Days", value: byRecency.from8To30Days },
        { category: "from31To90Days", value: byRecency.from31To90Days },
        { category: "over90Days", value: byRecency.over90Days },
        { category: "never", value: byRecency.never },
    ];

    return (
        <CategoryBarChart
            className="aspect-auto h-64 w-full"
            config={config}
            data={data}
            label={activity.chart.title}
        />
    );
}
