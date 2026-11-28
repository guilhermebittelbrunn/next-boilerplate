import { cn } from "@repo/design-system/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthCardTone = "primary" | "success" | "warning" | "destructive";

type AuthCardProps = {
    readonly title: string;
    readonly description: string;
    readonly children?: ReactNode;
    readonly footer?: ReactNode;
    readonly icon?: LucideIcon;
    readonly tone?: AuthCardTone;
};

const toneClassName: Record<AuthCardTone, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    destructive: "bg-destructive/10 text-destructive",
};

export function AuthCard({
    title,
    description,
    children,
    footer,
    icon: Icon,
    tone = "primary",
}: AuthCardProps) {
    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-6 rounded-xl bg-card p-6 text-card-foreground shadow-card sm:p-8">
                <div className="flex flex-col gap-2">
                    {Icon ? (
                        <span
                            className={cn(
                                "mb-2 flex size-10 items-center justify-center rounded-md",
                                toneClassName[tone]
                            )}
                        >
                            <Icon aria-hidden className="size-5" />
                        </span>
                    ) : null}
                    <h1 className="text-balance break-words font-semibold text-2xl tracking-tight">
                        {title}
                    </h1>
                    <p className="text-pretty break-words text-muted-foreground text-sm">
                        {description}
                    </p>
                </div>
                {children}
            </div>
            {footer ? (
                <div className="text-center text-muted-foreground text-sm">
                    {footer}
                </div>
            ) : null}
        </div>
    );
}
