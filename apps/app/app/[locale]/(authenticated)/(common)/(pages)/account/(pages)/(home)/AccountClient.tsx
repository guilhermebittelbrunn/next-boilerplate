"use client";

import { getDictionary } from "@repo/internationalization/client";
import { Suspense } from "react";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { COMMON_ROUTES } from "../../../../paths";
import { AccountTabs } from "../../(components)/AccountTabs";

export function AccountClient() {
    const { dictionary, locale } = getDictionary();
    const routes = COMMON_ROUTES(dictionary, locale);
    const accountCopy = dictionary.apps.app.pages.common.account;
    const { data: account, isLoading, isError } = useMyAccount();

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                ]}
                page={accountCopy.title}
            />
            <Container
                contentOnly
                loadError={isError ? accountCopy.messages.loadError : null}
                loading={isLoading}
            >
                <p className="mb-4 text-muted-foreground text-sm">
                    {accountCopy.subtitle}
                </p>
                <Suspense fallback={null}>
                    <AccountTabs account={account} />
                </Suspense>
            </Container>
        </>
    );
}
