import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { Check, Plus } from "lucide-react";

const LOCAL_APPS = [
    { workspace: "app", url: "localhost:3000" },
    { workspace: "web", url: "localhost:3001" },
    { workspace: "api", url: "localhost:3002" },
    { workspace: "email", url: "localhost:3003" },
] as const;

const ACTIVE_NAV_INDEX = 1;
const INACTIVE_ROW_INDEX = 3;

export const ProductPreview = async () => {
    const { dictionary } = await getDictionary();
    const previewCopy = dictionary.apps.web.pages.home.hero.preview;

    return (
        <figure className="hero-enter hero-enter-late">
            <div className="relative sm:pb-12">
                <div
                    aria-hidden="true"
                    className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-overlay"
                >
                    <div className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                        <div className="hidden flex-col gap-0.5 border-r bg-sidebar p-3 sm:flex">
                            <div className="mb-3 flex items-center gap-2 px-2 pt-1">
                                <span className="size-4 rounded-[5px] bg-primary" />
                                <span className="h-2 w-14 rounded-full bg-border" />
                            </div>
                            {previewCopy.nav.map((item, index) => (
                                <span
                                    className={cn(
                                        "rounded-md px-2 py-1.5 text-xs",
                                        index === ACTIVE_NAV_INDEX
                                            ? "bg-sidebar-accent font-medium text-foreground"
                                            : "text-muted-foreground"
                                    )}
                                    key={item}
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                        <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-sm tracking-tight">
                                    {previewCopy.title}
                                </p>
                                <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-medium text-[0.6875rem] text-primary-foreground">
                                    <Plus className="size-3" />
                                    {previewCopy.newItem}
                                </span>
                            </div>
                            <div className="h-8 rounded-md border bg-background" />
                            <div className="divide-y rounded-lg border">
                                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-3 bg-muted/60 px-3 py-2 font-medium text-[0.6875rem] text-muted-foreground">
                                    <span>{previewCopy.columns.name}</span>
                                    <span>{previewCopy.columns.type}</span>
                                    <span>{previewCopy.columns.status}</span>
                                </div>
                                {previewCopy.rows.map((row, index) => (
                                    <div
                                        className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-xs"
                                        key={row.name}
                                    >
                                        <span className="truncate font-medium">
                                            {row.name}
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                            {row.type}
                                        </span>
                                        <Badge
                                            variant={
                                                index === INACTIVE_ROW_INDEX
                                                    ? "secondary"
                                                    : "success"
                                            }
                                        >
                                            {row.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    aria-hidden="true"
                    className="sm:-left-6 mt-3 w-full rounded-lg bg-foreground p-3.5 font-mono text-[0.6875rem] text-background shadow-popover sm:absolute sm:bottom-0 sm:mt-0 sm:w-48 dark:bg-popover dark:text-popover-foreground"
                    translate="no"
                >
                    <p className="mb-2 opacity-70">$ pnpm dev</p>
                    <ul className="flex flex-col gap-1">
                        {LOCAL_APPS.map((app) => (
                            <li
                                className="flex items-center justify-between gap-3"
                                key={app.workspace}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Check className="size-3 opacity-70" />
                                    {app.workspace}
                                </span>
                                <span className="opacity-70">{app.url}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 opacity-70">
                        {previewCopy.terminalReady}
                    </p>
                </div>
            </div>
            <figcaption className="mt-3 text-muted-foreground text-xs sm:text-right">
                {previewCopy.caption}
            </figcaption>
        </figure>
    );
};
