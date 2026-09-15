"use client";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { AccountBillingPlaceholder } from "./AccountBillingPlaceholder";
import { AccountPreferencesForm } from "./AccountPreferencesForm";
import { AccountProfileForm } from "./AccountProfileForm";
import { AccountSecurityForm } from "./AccountSecurityForm";

const accountTabValues = [
    "profile",
    "security",
    "preferences",
    "billing",
] as const;

type AccountTabValue = (typeof accountTabValues)[number];

const resolveTab = (raw: string | null): AccountTabValue =>
    accountTabValues.includes(raw as AccountTabValue)
        ? (raw as AccountTabValue)
        : "profile";

type AccountTabsProps = {
    account: AccountDTO | undefined;
};

export function AccountTabs({ account }: AccountTabsProps) {
    const { dictionary } = getDictionary();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const accountCopy = dictionary.apps.app.pages.common.account;
    const [activeTab, setActiveTab] = useState(() =>
        resolveTab(searchParams.get("tab"))
    );

    // The query string is kept in sync through the History API rather than the router:
    // the tab is client state, and a router navigation would pay a server round-trip to
    // re-render a page whose data did not change.
    const selectTab = (value: string) => {
        const tab = resolveTab(value);
        setActiveTab(tab);
        window.history.replaceState(null, "", `${pathname}?tab=${tab}`);
    };

    return (
        <Tabs onValueChange={selectTab} value={activeTab}>
            <TabsList>
                {accountTabValues.map((value) => (
                    <TabsTrigger key={value} value={value}>
                        {accountCopy.tabs[value]}
                    </TabsTrigger>
                ))}
            </TabsList>

            <ImpersonationReadOnlyNotice />

            <TabsContent value="profile">
                <AccountProfileForm account={account} />
            </TabsContent>
            <TabsContent value="security">
                <AccountSecurityForm />
            </TabsContent>
            <TabsContent value="preferences">
                <AccountPreferencesForm account={account} />
            </TabsContent>
            <TabsContent value="billing">
                <AccountBillingPlaceholder />
            </TabsContent>
        </Tabs>
    );
}
