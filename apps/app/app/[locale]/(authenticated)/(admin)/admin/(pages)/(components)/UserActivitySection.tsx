"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { ActivityIcon, MoonIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { useUserActivitySummary } from "../(hooks)/useUserActivitySummary";

// Deferred so the cards paint without waiting for recharts, which does not tree-shake and
// would otherwise land whole in the chunk of the first screen an admin opens.
const UserRecencyChart = dynamic(
    () => import("./UserRecencyChart").then((mod) => mod.UserRecencyChart),
    {
        ssr: false,
        loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
    }
);

function fillPlaceholders(
    template: string,
    values: Record<string, number>
): string {
    return Object.entries(values).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        template
    );
}

export function UserActivitySection() {
    const { data: activity, isLoading, error } = useUserActivitySummary();
    const { dictionary, locale } = getDictionary();

    const activityCopy = dictionary.apps.app.pages.admin.home.activity;
    const activityLoadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;

    const thresholds = activity?.thresholds;
    const activeHint = thresholds
        ? fillPlaceholders(activityCopy.metrics.active.hint, {
              days: thresholds.activeDays,
              minutes: thresholds.precisionMinutes,
          })
        : undefined;
    const inactiveHint = thresholds
        ? fillPlaceholders(activityCopy.metrics.inactive.hint, {
              days: thresholds.inactiveDays,
          })
        : undefined;

    const renderContent = () => {
        if (activityLoadError) {
            return <LoadErrorState message={activityLoadError} />;
        }

        if (isLoading || !activity) {
            return (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <MetricCard
                            label={activityCopy.metrics.active.label}
                            loading
                            value={0}
                        />
                        <MetricCard
                            label={activityCopy.metrics.inactive.label}
                            loading
                            value={0}
                        />
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </>
            );
        }

        return (
            <>
                <div className="grid gap-4 sm:grid-cols-2">
                    <MetricCard
                        hint={activeHint}
                        icon={<ActivityIcon className="size-4" />}
                        label={activityCopy.metrics.active.label}
                        value={activity.active}
                    />
                    <MetricCard
                        hint={inactiveHint}
                        icon={<MoonIcon className="size-4" />}
                        label={activityCopy.metrics.inactive.label}
                        value={activity.inactive}
                    />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{activityCopy.chart.title}</CardTitle>
                        <CardDescription>
                            {activityCopy.chart.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <UserRecencyChart byRecency={activity.byRecency} />
                        {activity.byRecency.never > 0 && (
                            <p className="text-muted-foreground text-xs">
                                {fillPlaceholders(activityCopy.neverNotice, {
                                    count: activity.byRecency.never,
                                })}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </>
        );
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-lg tracking-tight">
                    {activityCopy.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                    {activityCopy.description}
                </p>
            </div>
            {renderContent()}
        </section>
    );
}
