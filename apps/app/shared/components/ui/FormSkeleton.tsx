import { Skeleton } from "@repo/design-system/components/ui/skeleton";

type FormSkeletonProps = {
    fields?: number;
    columns?: 1 | 2;
};

/** Placeholder for form pages (matches the `FormContainer` two-column grid). */
export function FormSkeleton({ fields = 6, columns = 2 }: FormSkeletonProps) {
    const fieldKeys = Array.from(
        { length: fields },
        (_, index) => `field-${index}`
    );

    return (
        <div
            className={
                columns === 2
                    ? "grid w-full grid-cols-1 gap-5 md:grid-cols-2"
                    : "grid w-full grid-cols-1 gap-5"
            }
        >
            {fieldKeys.map((key) => (
                <div className="flex flex-col gap-2" key={key}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                </div>
            ))}
        </div>
    );
}
