import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

type FormSurfaceProps = {
    children: ReactNode;
    className?: string;
};

/** The raised card a full-page form sits on; the page itself has no panel behind it. */
export function FormSurface({ children, className }: FormSurfaceProps) {
    return (
        <div
            className={cn(
                "rounded-xl bg-card p-5 text-card-foreground shadow-card sm:p-8",
                className
            )}
            data-slot="form-surface"
        >
            {children}
        </div>
    );
}
