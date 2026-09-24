"use client";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { getDictionary } from "@repo/internationalization/client";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { AccountDTO } from "@repo/sdk/src/types";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { AccountBillingPanel } from "./AccountBillingPanel";
import { AccountPreferencesForm } from "./AccountPreferencesForm";
import { AccountPrivacyPanel } from "./AccountPrivacyPanel";
import { AccountProfileForm } from "./AccountProfileForm";
import { AccountSecurityForm } from "./AccountSecurityForm";

const allAccountTabValues = [
    "profile",
    "security",
    "preferences",
    "billing",
    "privacy",
] as const;

type AccountTabValue = (typeof allAccountTabValues)[number];

// A product without subscriptions has nothing to bill, so the tab is not rendered at all
// and a link to `?tab=billing` lands on the profile.
const accountTabValues: readonly AccountTabValue[] = isSubscriptionMode()
    ? allAccountTabValues
    : allAccountTabValues.filter((value) => value !== "billing");

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
            {/* The strip sizes itself to the tabs and has no scroll of its own, so on a
                narrow screen it grows past the viewport and takes the whole page with it.
                Scrolling it here keeps the page width independent of how long the
                translated labels are. */}
            <div className="w-full overflow-x-auto overflow-y-hidden">
                <TabsList>
                    {accountTabValues.map((value) => (
                        <TabsTrigger key={value} value={value}>
                            {accountCopy.tabs[value]}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

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
            {accountTabValues.includes("billing") ? (
                <TabsContent value="billing">
                    <AccountBillingPanel account={account} />
                </TabsContent>
            ) : null}
            <TabsContent value="privacy">
                <AccountPrivacyPanel account={account} />
            </TabsContent>
        </Tabs>
    );
}
