"use client";

import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, type Ref, useId } from "react";

type SettingsSectionProps = {
    title: string;
    description?: ReactNode;
    tone?: "default" | "destructive";
    /** `2` when the section is a top-level region of the page; `3` inside a tab or a group. */
    headingLevel?: 2 | 3;
    /** False keeps the heading and spacing without the card, for a block that holds its own surface. */
    surface?: boolean;
    /** Lets the page move focus to the heading, which then becomes programmatically focusable. */
    titleRef?: Ref<HTMLHeadingElement>;
    children?: ReactNode;
};

export function SettingsSection({
    title,
    description,
    tone = "default",
    headingLevel = 3,
    surface = true,
    titleRef,
    children,
}: SettingsSectionProps) {
    const titleId = useId();
    const isDestructive = tone === "destructive";
    const Heading = headingLevel === 2 ? "h2" : "h3";

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                "flex flex-col gap-4",
                surface &&
                    "gap-5 rounded-xl bg-card p-5 text-card-foreground shadow-card sm:p-6",
                isDestructive && "border border-destructive/40"
            )}
            data-tone={tone}
        >
            <div className="flex flex-col gap-1">
                <Heading
                    className={cn(
                        "font-semibold tracking-tight outline-none",
                        headingLevel === 2
                            ? "text-lg leading-tight"
                            : "leading-none",
                        isDestructive && "text-destructive"
                    )}
                    id={titleId}
                    ref={titleRef}
                    tabIndex={titleRef ? -1 : undefined}
                >
                    {title}
                </Heading>
                {description ? (
                    <p className="max-w-prose text-pretty text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {children}
        </section>
    );
}
