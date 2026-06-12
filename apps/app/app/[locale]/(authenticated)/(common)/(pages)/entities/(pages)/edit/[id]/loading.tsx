import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";

export default function Loading() {
    return (
        <div className="flex max-w-full flex-1 flex-col gap-6 p-4 pt-6">
            <Skeleton className="h-8 w-56" />
            <div className="rounded-xl bg-muted/50 p-4">
                <FormSkeleton />
            </div>
        </div>
    );
}
