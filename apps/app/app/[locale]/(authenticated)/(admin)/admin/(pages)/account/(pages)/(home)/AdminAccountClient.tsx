"use client";

import { getDictionary } from "@repo/internationalization/client";
import { Suspense } from "react";
import { AccountTabs } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { ADMIN_ROUTES } from "../../../../paths";

export function AdminAccountClient() {
    const { dictionary, locale } = getDictionary();
    const routes = ADMIN_ROUTES(dictionary, locale);
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
                header={
                    <PageHeader
                        description={accountCopy.subtitle}
                        title={accountCopy.title}
                    />
                }
                loadError={isError ? accountCopy.messages.loadError : null}
                loading={isLoading}
                width="narrow"
            >
                <Suspense fallback={null}>
                    <AccountTabs account={account} area="admin" />
                </Suspense>
            </Container>
        </>
    );
}
