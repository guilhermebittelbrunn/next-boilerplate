"use client";

import { getDictionary } from "@repo/internationalization/client";

export function AuthBrandPanel() {
    const { dictionary } = getDictionary();
    const brandPanelCopy = dictionary.apps.app.pages.signIn.brandPanel;

    return (
        <aside className="hidden p-3 lg:flex">
            <div className="flex flex-1 flex-col justify-end rounded-xl bg-primary p-12 text-primary-foreground dark:bg-card dark:text-card-foreground dark:shadow-card">
                <div className="flex max-w-md flex-col gap-4">
                    <p className="text-balance font-semibold text-4xl leading-[1.1] tracking-tight">
                        {brandPanelCopy.tagline}
                    </p>
                    <p className="max-w-[45ch] text-pretty text-base text-primary-foreground/80 dark:text-muted-foreground">
                        {brandPanelCopy.description}
                    </p>
                </div>
            </div>
        </aside>
    );
}
