import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./components/ForgotPasswordForm";

type ForgotPasswordProps = {
    readonly params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
    params,
}: ForgotPasswordProps): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.forgotPassword.meta);
};

export default function ForgotPassword() {
    return <ForgotPasswordForm />;
}
