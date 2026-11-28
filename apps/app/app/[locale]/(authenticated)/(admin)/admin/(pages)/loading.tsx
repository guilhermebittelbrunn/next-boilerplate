import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

const USER_METRIC_SLOTS = ["total", "admins", "common"];
const ACTIVITY_METRIC_SLOTS = ["active", "inactive"];

function MetricSlot() {
    return (
        <div className="flex flex-col gap-2 px-5 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-40 max-w-full" />
        </div>
    );
}

export default function Loading() {
    return (
        <PageSkeleton description>
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {USER_METRIC_SLOTS.map((slot) => (
                        <MetricSlot key={slot} />
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="h-4 w-72 max-w-full" />
                    </div>
                    <div className="overflow-hidden rounded-xl bg-card shadow-card">
                        <div className="grid grid-cols-2 divide-x divide-border">
                            {ACTIVITY_METRIC_SLOTS.map((slot) => (
                                <MetricSlot key={slot} />
                            ))}
                        </div>
                        <div className="border-border border-t px-5 py-5">
                            <Skeleton className="h-60 w-full rounded-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </PageSkeleton>
    );
}
