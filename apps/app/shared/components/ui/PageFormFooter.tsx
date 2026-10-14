"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";

export type PageFormFooterProps = {
    cancelLabel: string;
    submitLabel: string;
    onCancel: () => void;
    isSubmitting?: boolean;
    submitDisabled?: boolean;
    className?: string;
};

/**
 * Sticky action bar for forms (cancel + submit). Place **inside** `<form>` so submit works without `form="…"`.
 * Styling matches {@link Container} footer strip.
 */
export function PageFormFooter({
    cancelLabel,
    submitLabel,
    onCancel,
    isSubmitting = false,
    submitDisabled = false,
    className,
}: PageFormFooterProps) {
    return (
        <div
            className={cn(
                "sticky bottom-0 z-10 mt-4 flex w-full flex-wrap items-center justify-end gap-3 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80",
                className
            )}
        >
            <Button onClick={onCancel} type="button" variant="outline">
                {cancelLabel}
            </Button>
            <Button
                disabled={submitDisabled}
                loading={isSubmitting}
                type="submit"
            >
                {submitLabel}
            </Button>
        </div>
    );
}
