"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { CircleAlertIcon, RotateCwIcon } from "lucide-react";

export type LoadErrorStateProps = {
    message: string;
    className?: string;
    onRetry?: () => void;
    retrying?: boolean;
};

export function LoadErrorState({
    message,
    className,
    onRetry,
    retrying,
}: LoadErrorStateProps) {
    const { dictionary } = getDictionary();
    return (
        <div
            className={cn(
                "flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-12 text-center text-muted-foreground text-sm shadow-card",
                className
            )}
            role="alert"
        >
            <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <CircleAlertIcon aria-hidden="true" className="size-5" />
            </span>
            <p className="max-w-sm text-pretty">{message}</p>
            {onRetry ? (
                <Button
                    disabled={retrying}
                    onClick={onRetry}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    <RotateCwIcon
                        aria-hidden="true"
                        className={cn(retrying && "animate-spin")}
                    />
                    {dictionary.components.button.retry}
                </Button>
            ) : null}
        </div>
    );
}
