"use client";

import { getDictionary } from "@repo/internationalization/client";
import { CreditCardIcon } from "lucide-react";

export function AccountBillingPlaceholder() {
    const { dictionary } = getDictionary();
    const accountBilling = dictionary.apps.app.pages.common.account.billing;

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border border-dashed p-10 text-center">
            <CreditCardIcon
                aria-hidden
                className="size-8 text-muted-foreground"
            />
            <span className="font-medium">{accountBilling.emptyTitle}</span>
            <p className="max-w-sm text-muted-foreground text-sm">
                {accountBilling.emptyDescription}
            </p>
        </div>
    );
}
