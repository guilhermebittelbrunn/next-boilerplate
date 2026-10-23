import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { TableSkeleton } from "@/shared/components/ui/TableSkeleton";

export default function Loading() {
    return (
        <div className="flex max-w-full flex-1 flex-col gap-4 p-4 pt-6">
            <Skeleton className="h-8 w-40" />
            <TableSkeleton />
        </div>
    );
}
