import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ConfirmEmailChangeResult } from "./components/ConfirmEmailChangeResult";
import { VerifyEmailResult } from "./components/VerifyEmailResult";

const EMAIL_CHANGE_MODE = "verifyAndChangeEmail";

type LocaleParams = {
    readonly params: Promise<{ locale: string }>;
};

type VerifyEmailProps = LocaleParams & {
    readonly searchParams: Promise<{
        oobCode?: string | string[];
        mode?: string | string[];
    }>;
};

export const generateMetadata = async ({
    params,
}: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.emailVerification.meta);
};

export default async function VerifyEmail({ searchParams }: VerifyEmailProps) {
    const { oobCode, mode } = await searchParams;
    const code = typeof oobCode === "string" && oobCode !== "" ? oobCode : null;

    if (mode === EMAIL_CHANGE_MODE) {
        return <ConfirmEmailChangeResult oobCode={code} />;
    }

    return <VerifyEmailResult oobCode={code} />;
}
