import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";

export default function Loading() {
    return (
        <div className="flex min-h-dvh w-full items-center justify-center p-4">
            <div className="flex w-full max-w-[400px] flex-col gap-6">
                <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex flex-col gap-4 rounded-xl border p-6">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-6 w-48" />
                    <FormSkeleton fields={1} />
                </div>
            </div>
        </div>
    );
}
