import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";
import {
    PAGE_BODY_CLASS,
    PAGE_HEADER_SPACING_CLASS,
    PAGE_NARROW_CLASS,
    type PageWidth,
} from "@/shared/components/ui/pageLayout";

type PageSkeletonProps = {
    description?: boolean;
    actions?: boolean;
    width?: PageWidth;
    children?: ReactNode;
};

/** Mirrors `Header` + `Container header` so the title does not shift when the page replaces it. */
export function PageSkeleton({
    description = false,
    actions = false,
    width = "full",
    children,
}: PageSkeletonProps) {
    return (
        <>
            <div className="flex h-16 shrink-0 items-center px-4">
                <Skeleton className="h-4 w-40" />
            </div>
            <div
                className={cn(
                    PAGE_BODY_CLASS,
                    width === "narrow" && PAGE_NARROW_CLASS
                )}
            >
                <div
                    className={cn(
                        "flex items-start justify-between gap-4",
                        PAGE_HEADER_SPACING_CLASS
                    )}
                >
                    <div className="flex flex-col gap-1">
                        <Skeleton className="h-8 w-56" />
                        {description ? (
                            <Skeleton className="h-5 w-72 max-w-full" />
                        ) : null}
                    </div>
                    {actions ? <Skeleton className="h-9 w-28" /> : null}
                </div>
                {children}
            </div>
        </>
    );
}
