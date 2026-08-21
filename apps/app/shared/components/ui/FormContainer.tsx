import { cn } from "@repo/design-system/lib/utils";

export type FormContainerProps = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Responsive grid for form fields: one column on small screens, two on `md+`.
 * Pair with a child wrapper using `className="contents"` so each field becomes a grid cell.
 */
export function FormContainer({ children, className }: FormContainerProps) {
    return (
        <div
            className={cn(
                "grid w-full grid-cols-1 gap-4 md:grid-cols-2",
                className
            )}
        >
            {children}
        </div>
    );
}
