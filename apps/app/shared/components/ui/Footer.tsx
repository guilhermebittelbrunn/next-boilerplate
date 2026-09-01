"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { useRouter } from "next/navigation";

export type FooterProps = {
    /**
     * When true (default), shows a secondary button that navigates back (`router.back()` unless `onBack` is set).
     */
    showBack?: boolean;
    backLabel?: string;
    onBack?: () => void;
    /**
     * When set, primary is `type="button"` with this handler and default label “Confirmar”.
     * When omitted, primary is `type="submit"` for use inside `<form>`.
     */
    onConfirm?: () => void;
    confirmLabel?: string;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
};

export function Footer({
    showBack = true,
    backLabel,
    onBack,
    onConfirm,
    confirmLabel,
    isLoading = false,
    disabled = false,
    className,
}: FooterProps) {
    const router = useRouter();
    const { dictionary } = getDictionary();
    const footerCopy = dictionary.components.footer;

    const handleBack = onBack ?? (() => router.back());
    const resolvedBackLabel = backLabel ?? footerCopy.back;
    const resolvedConfirmLabel = confirmLabel ?? footerCopy.confirm;

    return (
        <div
            className={cn(
                "sticky bottom-0 z-10 mt-4 flex w-full flex-wrap items-center justify-end gap-3 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80",
                className
            )}
        >
            {showBack || onBack ? (
                <Button onClick={handleBack} type="button" variant="outline">
                    {resolvedBackLabel}
                </Button>
            ) : null}
            {onConfirm ? (
                <Button
                    disabled={disabled}
                    loading={isLoading}
                    onClick={onConfirm}
                    type="button"
                >
                    {resolvedConfirmLabel}
                </Button>
            ) : (
                <Button disabled={disabled} loading={isLoading} type="submit">
                    {resolvedConfirmLabel}
                </Button>
            )}
        </div>
    );
}
