"use client";

import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, useId } from "react";

type SettingsSectionProps = {
    title: string;
    description?: ReactNode;
    tone?: "default" | "destructive";
    children?: ReactNode;
};

export function SettingsSection({
    title,
    description,
    tone = "default",
    children,
}: SettingsSectionProps) {
    const titleId = useId();
    const isDestructive = tone === "destructive";

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                "flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground sm:p-6",
                isDestructive && "border-destructive/50"
            )}
            data-tone={tone}
        >
            <div className="flex flex-col gap-1">
                <h3
                    className={cn(
                        "font-semibold leading-none",
                        isDestructive && "text-destructive"
                    )}
                    id={titleId}
                >
                    {title}
                </h3>
                {description ? (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {children}
        </section>
    );
}
