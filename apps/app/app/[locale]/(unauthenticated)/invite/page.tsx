import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppSessionUser } from "@/lib/server/authSession";
import { isOrganizationMembersEnabled } from "@/shared/lib/organizationMembersEnabled";
import { InvitationAcceptance } from "./components/InvitationAcceptance";

type LocaleParams = {
    readonly params: Promise<{ locale: string }>;
};

type InvitePageProps = LocaleParams & {
    readonly searchParams: Promise<{ token?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    // Next applies the route's metadata to its 404 too, so with members off the tab and the
    // link preview must say what the page says, not name the team.
    if (!isOrganizationMembersEnabled()) {
        const notFoundCopy = dictionary.apps.app.pages.common.notFound;
        return createMetadata({
            title: notFoundCopy.title,
            description: notFoundCopy.description,
        });
    }

    return createMetadata(dictionary.apps.app.pages.invitation.meta);
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
    if (!isOrganizationMembersEnabled()) {
        notFound();
    }

    const [{ token }, sessionUser] = await Promise.all([
        searchParams,
        getAppSessionUser(),
    ]);
    const signedInEmail =
        typeof sessionUser?.email === "string" ? sessionUser.email : null;

    return (
        <InvitationAcceptance
            signedInEmail={signedInEmail}
            token={typeof token === "string" && token !== "" ? token : null}
        />
    );
}
