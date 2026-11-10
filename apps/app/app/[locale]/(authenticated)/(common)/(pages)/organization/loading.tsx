import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";
import { TableSkeleton } from "@/shared/components/ui/TableSkeleton";

export default function Loading() {
    return (
        <PageSkeleton description>
            <TableSkeleton />
        </PageSkeleton>
    );
}
