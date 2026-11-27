"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import dynamic from "next/dynamic";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { MetricStrip } from "@/shared/components/ui/MetricStrip";
import { useUserActivitySummary } from "../(hooks)/useUserActivitySummary";

const CHART_HEIGHT_CLASS = "h-60";

// Deferred so the counts paint without waiting for recharts, which does not tree-shake and
// would otherwise land whole in the chunk of the first screen an admin opens.
const UserRecencyChart = dynamic(
    () => import("./UserRecencyChart").then((mod) => mod.UserRecencyChart),
    {
        ssr: false,
        loading: () => (
            <Skeleton className={`${CHART_HEIGHT_CLASS} w-full rounded-lg`} />
        ),
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
    const {
        data: activity,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useUserActivitySummary();
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

    const loading = isLoading || !activity;
    const neverCount = activity?.byRecency.never ?? 0;

    const metrics = [
        {
            key: "active",
            label: activityCopy.metrics.active.label,
            hint: activeHint,
            value: activity?.active ?? 0,
        },
        {
            key: "inactive",
            label: activityCopy.metrics.inactive.label,
            hint: inactiveHint,
            value: activity?.inactive ?? 0,
        },
    ];

    const renderContent = () => {
        if (activityLoadError) {
            return (
                <LoadErrorState
                    message={activityLoadError}
                    onRetry={() => refetch()}
                    retrying={isFetching}
                />
            );
        }

        return (
            <div className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-card">
                <MetricStrip
                    items={metrics}
                    loading={loading}
                    locale={locale}
                />
                <div className="flex flex-col gap-4 border-border border-t px-5 py-5">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-base tracking-tight">
                            {activityCopy.chart.title}
                        </h3>
                        <p className="max-w-[65ch] text-pretty text-muted-foreground text-sm">
                            {activityCopy.chart.description}
                        </p>
                    </div>
                    {activity ? (
                        <UserRecencyChart byRecency={activity.byRecency} />
                    ) : (
                        <Skeleton
                            className={`${CHART_HEIGHT_CLASS} w-full rounded-lg`}
                        />
                    )}
                    {neverCount > 0 && (
                        <p className="text-pretty text-muted-foreground text-xs">
                            {fillPlaceholders(
                                neverCount === 1
                                    ? activityCopy.neverNoticeOne
                                    : activityCopy.neverNotice,
                                { count: neverCount }
                            )}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <section
            aria-labelledby="admin-activity-title"
            className="flex flex-col gap-4"
        >
            <div className="flex flex-col gap-1">
                <h2
                    className="font-semibold text-lg tracking-tight"
                    id="admin-activity-title"
                >
                    {activityCopy.title}
                </h2>
                <p className="max-w-[65ch] text-pretty text-muted-foreground text-sm">
                    {activityCopy.description}
                </p>
            </div>
            {renderContent()}
        </section>
    );
}
