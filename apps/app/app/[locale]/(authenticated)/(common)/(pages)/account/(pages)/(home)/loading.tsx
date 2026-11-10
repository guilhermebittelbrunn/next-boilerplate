import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { PageSkeleton } from "@/shared/components/ui/PageSkeleton";

const sectionNavKeys = ["nav-1", "nav-2", "nav-3", "nav-4", "nav-5"];

export default function Loading() {
    return (
        <PageSkeleton description width="narrow">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
                <Skeleton className="h-9 w-56 lg:hidden" />
                <div className="hidden w-48 shrink-0 flex-col gap-1 lg:flex">
                    {sectionNavKeys.map((key) => (
                        <Skeleton className="h-9 w-full" key={key} />
                    ))}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-5 w-64 max-w-full" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        </PageSkeleton>
    );
}
