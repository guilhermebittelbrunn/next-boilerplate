import { Spinner } from "@repo/design-system/components/ui/spinner";
import type { ReactNode } from "react";

type AuthPendingProps = {
    readonly message: string;
    readonly children?: ReactNode;
};

export function AuthPending({ message, children }: AuthPendingProps) {
    return (
        <div className="flex w-full flex-col items-center gap-6 py-16">
            <output
                aria-live="polite"
                className="flex flex-col items-center gap-3"
            >
                <Spinner aria-hidden className="size-6 text-muted-foreground" />
                <p className="text-center text-muted-foreground text-sm">
                    {message}
                </p>
            </output>
            {children}
        </div>
    );
}
