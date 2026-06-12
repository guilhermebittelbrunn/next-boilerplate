import { Skeleton } from "@repo/design-system/components/ui/skeleton";

type FormSkeletonProps = {
    fields?: number;
};

/** Placeholder for form pages (matches the `FormContainer` two-column grid). */
export function FormSkeleton({ fields = 6 }: FormSkeletonProps) {
    const fieldKeys = Array.from(
        { length: fields },
        (_, index) => `field-${index}`
    );

    return (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {fieldKeys.map((key) => (
                <div className="flex flex-col gap-2" key={key}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
        </div>
    );
}
