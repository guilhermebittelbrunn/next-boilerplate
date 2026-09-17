import { Skeleton } from "@repo/design-system/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex max-w-full flex-1 flex-col gap-6 p-4 pt-6">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        </div>
    );
}
