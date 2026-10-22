import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { EmailLinkCompletion } from "./components/EmailLinkCompletion";
import { EmailLinkRequestForm } from "./components/EmailLinkRequestForm";

type LocaleParams = {
    readonly params: Promise<{ locale: string }>;
};

type EmailLinkSignInProps = LocaleParams & {
    readonly searchParams: Promise<{ oobCode?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.emailLinkSignIn.meta);
};

export default async function EmailLinkSignIn({
    searchParams,
}: EmailLinkSignInProps) {
    const { oobCode } = await searchParams;

    if (oobCode === undefined) {
        return <EmailLinkRequestForm />;
    }

    const code = typeof oobCode === "string" && oobCode !== "" ? oobCode : null;
    return <EmailLinkCompletion oobCode={code} />;
}
