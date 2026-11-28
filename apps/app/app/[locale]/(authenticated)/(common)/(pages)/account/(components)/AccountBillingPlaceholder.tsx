"use client";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { getDictionary } from "@repo/internationalization/client";
import { CreditCardIcon } from "lucide-react";

export function AccountBillingPlaceholder() {
    const { dictionary } = getDictionary();
    const accountBilling = dictionary.apps.app.pages.common.account.billing;

    return (
        <Empty className="rounded-xl bg-card shadow-card">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <CreditCardIcon
                        aria-hidden
                        className="text-muted-foreground"
                    />
                </EmptyMedia>
                <EmptyTitle>{accountBilling.emptyTitle}</EmptyTitle>
                <EmptyDescription>
                    {accountBilling.emptyDescription}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
