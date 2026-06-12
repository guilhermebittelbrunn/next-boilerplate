import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { TableSkeleton } from "@/shared/components/ui/TableSkeleton";

export default function Loading() {
    return (
        <div className="flex max-w-full flex-1 flex-col gap-4 p-4 pt-6">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <TableSkeleton />
        </div>
    );
}
