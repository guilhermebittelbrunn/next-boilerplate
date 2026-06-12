import { cn } from "@repo/design-system/lib/utils";

export type LoadErrorStateProps = {
    message: string;
    className?: string;
};

export function LoadErrorState({ message, className }: LoadErrorStateProps) {
    return (
        <div
            className={cn(
                "rounded-xl bg-muted/50 p-6 text-center text-muted-foreground text-sm",
                className
            )}
        >
            {message}
        </div>
    );
}
