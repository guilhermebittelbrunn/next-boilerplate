import { Card } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { FormSkeleton } from "@/shared/components/ui/FormSkeleton";

export default function Loading() {
    return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10 sm:px-8">
            <div className="flex w-full max-w-[440px] flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-36" />
                </div>
                <Card className="gap-6 p-6 sm:p-8">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-1.5 w-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-6 w-56" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <FormSkeleton fields={1} />
                </Card>
            </div>
        </div>
    );
}
