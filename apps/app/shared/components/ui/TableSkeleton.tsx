import { Skeleton } from "@repo/design-system/components/ui/skeleton";

type TableSkeletonProps = {
    rows?: number;
};

/** Placeholder for list pages while the server prefetch / query resolves. */
export function TableSkeleton({ rows = 8 }: TableSkeletonProps) {
    const rowKeys = Array.from({ length: rows }, (_, index) => `row-${index}`);

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-9 w-28" />
            </div>
            <div className="overflow-hidden rounded-xl bg-card shadow-card">
                <Skeleton className="h-10 w-full rounded-none bg-muted/60" />
                <div className="divide-y divide-border">
                    {rowKeys.map((key) => (
                        <div
                            className="flex h-12 items-center gap-6 px-4"
                            key={key}
                        >
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="ml-auto h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
