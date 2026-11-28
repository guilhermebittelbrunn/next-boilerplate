"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { BillingPlanCountDTO } from "@repo/sdk/src/types";
import dynamic from "next/dynamic";
import {
    buildPlanChartEntries,
    describePlanInterval,
    type PlanChartCopy,
    type PlanChartEntry,
    type PlanIntervalCopy,
} from "@/shared/lib/billingInsights";

// Deferred for the same reason as the recency chart: recharts does not tree-shake and
// would otherwise land whole in the chunk of the admin home.
const BillingPlansChart = dynamic(
    () => import("./BillingPlansChart").then((mod) => mod.BillingPlansChart),
    {
        ssr: false,
        loading: () => <Skeleton className="h-60 w-full rounded-lg" />,
    }
);

export type BillingPlansCopy = PlanChartCopy &
    PlanIntervalCopy & {
        title: string;
        description: string;
        empty: string;
    };

type BillingPlansCardProps = {
    plans: BillingPlanCountDTO[];
    copy: BillingPlansCopy;
    className?: string;
};

function entryDetails(entry: PlanChartEntry, copy: BillingPlansCopy): string {
    if (!entry.plan) {
        return "";
    }
    return [
        describePlanInterval(
            copy,
            entry.plan.interval,
            entry.plan.intervalCount
        ),
        entry.plan.name ? null : entry.plan.priceId,
    ]
        .filter(Boolean)
        .join(" · ");
}

export function BillingPlansCard({
    plans,
    copy,
    className,
}: BillingPlansCardProps) {
    const entries = buildPlanChartEntries(plans, copy);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {entries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {copy.empty}
                    </p>
                ) : (
                    <>
                        <BillingPlansChart
                            entries={entries}
                            label={copy.title}
                        />
                        <ul className="flex flex-col divide-y divide-border">
                            {entries.map((entry) => {
                                const details = entryDetails(entry, copy);
                                return (
                                    <li
                                        className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                                        key={entry.key}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-3 shrink-0 rounded-sm"
                                            style={{
                                                backgroundColor: entry.color,
                                            }}
                                        />
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="font-medium [overflow-wrap:anywhere]">
                                                {entry.name}
                                            </span>
                                            {details && (
                                                <span className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                                                    {details}
                                                </span>
                                            )}
                                        </div>
                                        <span className="shrink-0 font-medium tabular-nums">
                                            {entry.count}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
