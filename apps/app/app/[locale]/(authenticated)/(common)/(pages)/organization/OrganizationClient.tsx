"use client";

import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { COMMON_ROUTES } from "../../paths";
import { InviteMemberForm } from "./(components)/InviteMemberForm";
import { LeaveOrganizationButton } from "./(components)/LeaveOrganizationButton";
import { OrganizationInvitationsTable } from "./(components)/OrganizationInvitationsTable";
import { OrganizationMembersTable } from "./(components)/OrganizationMembersTable";
import { useOrganization } from "./(hooks)/useOrganization";

export function OrganizationClient() {
    const { dictionary, locale } = getDictionary();
    const routes = COMMON_ROUTES(dictionary, locale);
    const organizationCopy = dictionary.apps.app.pages.common.organization;
    const { data: organization, isLoading, error } = useOrganization();

    const loadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;
    const isOwner = organization?.viewerRole === "owner";

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                ]}
                page={routes.organization.label}
            />
            <Container loadError={loadError} loading={isLoading}>
                <div className="mx-auto flex w-full flex-col gap-8">
                    <ImpersonationReadOnlyNotice />
                    <p className="text-muted-foreground text-sm">
                        {organizationCopy.description}
                    </p>
                    {isOwner ? <InviteMemberForm /> : null}
                    <OrganizationMembersTable isOwner={isOwner} />
                    {isOwner ? <OrganizationInvitationsTable /> : null}
                    {organization && !isOwner ? (
                        <LeaveOrganizationButton />
                    ) : null}
                </div>
            </Container>
        </>
    );
}
