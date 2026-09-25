"use client";

import { CategoryBarChart } from "@repo/design-system/components/ui/category-bar-chart";
import type { ChartConfig } from "@repo/design-system/components/ui/chart";
import type { PlanChartEntry } from "@/shared/lib/billingInsights";

type BillingPlansChartProps = {
    entries: PlanChartEntry[];
    label: string;
};

export function BillingPlansChart({ entries, label }: BillingPlansChartProps) {
    const config: ChartConfig = Object.fromEntries(
        entries.map((entry) => [
            entry.key,
            { label: entry.axisLabel, color: entry.color },
        ])
    );
    const data = entries.map((entry) => ({
        category: entry.key,
        value: entry.count,
    }));

    return (
        <CategoryBarChart
            className="aspect-auto h-64 w-full"
            config={config}
            data={data}
            label={label}
        />
    );
}
