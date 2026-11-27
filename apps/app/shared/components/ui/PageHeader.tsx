import type { ReactNode } from "react";

type PageHeaderProps = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5">
                <h1 className="font-semibold text-2xl tracking-tight md:text-[1.75rem] md:leading-tight">
                    {title}
                </h1>
                {description ? (
                    <p className="max-w-2xl text-pretty text-muted-foreground text-sm">
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
