import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";

type FullScreenLoaderProps = {
    className?: string;
};

/** Centered spinner for auth/session transitions (avoids flashing forms). */
export function FullScreenLoader({ className }: FullScreenLoaderProps) {
    return (
        <div
            className={cn(
                "flex min-h-[60vh] w-full items-center justify-center",
                className
            )}
        >
            <Spinner className="size-8" />
        </div>
    );
}
