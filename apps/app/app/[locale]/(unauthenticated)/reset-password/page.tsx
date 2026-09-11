import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./components/ResetPasswordForm";

type LocaleParams = {
    readonly params: Promise<{ locale: string }>;
};

type ResetPasswordProps = LocaleParams & {
    readonly searchParams: Promise<{ oobCode?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.resetPassword.meta);
};

export default async function ResetPassword({
    searchParams,
}: ResetPasswordProps) {
    const { oobCode } = await searchParams;
    const code = typeof oobCode === "string" && oobCode !== "" ? oobCode : null;

    return <ResetPasswordForm oobCode={code} />;
}
