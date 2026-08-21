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
                <Skeleton className="h-10 w-full max-w-xs" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="flex flex-col gap-2">
                {rowKeys.map((key) => (
                    <Skeleton className="h-12 w-full" key={key} />
                ))}
            </div>
        </div>
    );
}
