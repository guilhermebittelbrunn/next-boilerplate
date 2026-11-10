"use client";

import { Label } from "@repo/design-system/components/ui/label";
import {
    NativeSelect,
    NativeSelectOption,
} from "@repo/design-system/components/ui/native-select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { getDictionary } from "@repo/internationalization/client";
import type { AccountDTO } from "@repo/sdk/src/types";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useId } from "react";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { AccountBillingPanel } from "./AccountBillingPanel";
import { AccountPreferencesForm } from "./AccountPreferencesForm";
import { AccountPrivacyPanel } from "./AccountPrivacyPanel";
import { AccountProfileForm } from "./AccountProfileForm";
import { AccountSecurityForm } from "./AccountSecurityForm";
import {
    type AccountTabValue,
    accountTabHref,
    accountTabValues,
    resolveAccountTab,
} from "./accountTabRouting";

type AccountTabsProps = {
    account: AccountDTO | undefined;
};

function AccountSectionHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
        </div>
    );
}

export function AccountTabs({ account }: AccountTabsProps) {
    const { dictionary } = getDictionary();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sectionSelectId = useId();
    const accountCopy = dictionary.apps.app.pages.common.account;

    const requestedTab = searchParams.get("tab");
    const activeTab = resolveAccountTab(requestedTab);

    // Next keeps useSearchParams in sync with the History API, so the section follows
    // the URL without a router navigation re-rendering the page on the server.
    const selectTab = (value: string) => {
        window.history.replaceState(
            null,
            "",
            accountTabHref(pathname, searchParams, resolveAccountTab(value))
        );
    };

    useEffect(() => {
        if (requestedTab !== activeTab) {
            window.history.replaceState(
                null,
                "",
                accountTabHref(pathname, searchParams, activeTab)
            );
        }
    }, [requestedTab, activeTab, pathname, searchParams]);

    const sectionContent: Record<AccountTabValue, ReactNode> = {
        profile: <AccountProfileForm account={account} />,
        security: <AccountSecurityForm account={account} />,
        preferences: <AccountPreferencesForm account={account} />,
        billing: <AccountBillingPanel account={account} />,
        privacy: <AccountPrivacyPanel account={account} />,
    };

    return (
        <Tabs
            className="flex-col gap-6 lg:flex-row lg:items-start lg:gap-10"
            onValueChange={selectTab}
            orientation="vertical"
            value={activeTab}
        >
            <div className="lg:hidden">
                <Label className="sr-only" htmlFor={sectionSelectId}>
                    {accountCopy.sectionNav.label}
                </Label>
                <NativeSelect
                    className="min-w-56"
                    id={sectionSelectId}
                    onChange={(event) => selectTab(event.target.value)}
                    value={activeTab}
                >
                    {accountTabValues.map((value) => (
                        <NativeSelectOption key={value} value={value}>
                            {accountCopy.tabs[value]}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>

            <TabsList
                aria-label={accountCopy.sectionNav.label}
                className="hidden w-48 shrink-0 items-stretch lg:flex"
                variant="line"
            >
                {accountTabValues.map((value) => (
                    <TabsTrigger
                        className="justify-start whitespace-normal px-3 py-2 text-left"
                        key={value}
                        value={value}
                    >
                        {accountCopy.tabs[value]}
                    </TabsTrigger>
                ))}
            </TabsList>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <ImpersonationReadOnlyNotice />
                {accountTabValues.map((value) => (
                    <TabsContent
                        className="flex flex-col gap-6"
                        key={value}
                        value={value}
                    >
                        <AccountSectionHeading
                            description={accountCopy.sections[value]}
                            title={accountCopy.tabs[value]}
                        />
                        {sectionContent[value]}
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    );
}
