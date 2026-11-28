import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

const METRIC_SLOTS = ["total", "enabled"];

export default function Loading() {
    return (
        <PageSkeleton description>
            <div className="overflow-hidden rounded-xl bg-card shadow-card">
                <div className="grid grid-cols-2 divide-x divide-border">
                    {METRIC_SLOTS.map((slot) => (
                        <div
                            className="flex flex-col gap-2 px-5 py-4"
                            key={slot}
                        >
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-40 max-w-full" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 border-border border-t px-5 py-5">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-56 max-w-full" />
                    </div>
                    <Skeleton className="h-60 w-full rounded-lg" />
                </div>
            </div>
        </PageSkeleton>
    );
}
